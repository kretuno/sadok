import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, FileHeart } from 'lucide-react';
import api from '../../../api/axios';

const MedicalCardModal = lazy(() => import('./MedicalCardModal'));

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  groupName: string;
  status: string;
}

const ModalFallback: React.FC = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm">
    <div className="rounded-3xl border border-warm-100 bg-white px-6 py-4 text-sm font-medium text-gray-600 shadow-xl">
      Завантаження особової справи...
    </div>
  </div>
);

const MedicalCardsTab: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchChildren();
  }, []);

  const fetchChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/medical/children');
      console.log('Medical children fetched:', res.data);
      setChildren(res.data);
    } catch (e: any) {
      console.error('Помилка завантаження дітей', e);
      const msg = e.response?.data?.error || e.message || 'Не вдалося завантажити список дітей';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const activeChildren = children.filter(
    (child) =>
      !child.status ||
      child.status === 'active' ||
      (!child.status?.toString().startsWith('archived') && !child.status?.toString().includes(':')),
  );
  const archivedChildren = children.filter((child) => child.status?.toString().startsWith('archived'));
  const displayedChildren = showArchived ? archivedChildren : activeChildren;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <FileHeart size={20} className="text-warm-500" />
          Медичні картки дітей
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-400">
            {activeChildren.length} активних
          </span>
          {archivedChildren.length > 0 && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-sm font-semibold text-orange-500">
              {archivedChildren.length} в архіві
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowArchived((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
            showArchived
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          {showArchived ? 'Показати активних' : 'Архів вибулих'}
        </button>
      </div>

      {showArchived && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
          Відображено <strong>{archivedChildren.length}</strong> архівних карток. Медичні дані зберігаються без змін.
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center font-bold text-gray-400 animate-pulse">Завантаження...</div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
          <p className="font-bold">{error}</p>
          <button
            onClick={() => void fetchChildren()}
            className="ui-button mt-4 bg-red-100 text-red-800 hover:bg-red-200"
          >
            Спробувати ще раз
          </button>
        </div>
      ) : displayedChildren.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <FileHeart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">
            {showArchived ? 'Архівних карток немає' : 'Немає активних дітей'}
          </p>
          <p className="mt-2 text-xs uppercase tracking-widest opacity-50">
            Всього в базі: {children.length} {children.length === 1 ? 'запис' : 'записів'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayedChildren.map((child) => {
            const isArchived = child.status?.startsWith('archived');
            const archiveReason = isArchived ? child.status?.replace('archived:', '') : null;
            return (
              <div
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
                  isArchived
                    ? 'border-gray-200 bg-gray-50 opacity-70 hover:border-orange-200 hover:opacity-100'
                    : 'border-gray-100 bg-white hover:border-warm-300 hover:shadow-md'
                }`}
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="leading-tight font-black text-gray-800 transition-colors group-hover:text-warm-600">
                        {child.fullName}
                      </h3>
                      {isArchived && (
                        <span title="В архіві">
                          <Archive size={14} className="mt-0.5 shrink-0 text-orange-400" />
                        </span>
                      )}
                    </div>
                    <div className="mt-2 inline-block rounded-lg bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                      {child.groupName || 'Без групи'}
                    </div>
                  </div>
                  <div className="mt-4 text-xs font-bold text-gray-400">
                    Народився: {new Date(child.birthDate).toLocaleDateString('uk-UA')}
                  </div>
                  {archiveReason && (
                    <div className="mt-1 text-xs font-semibold text-orange-500">Причина: {archiveReason}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedChild && (
        <Suspense fallback={<ModalFallback />}>
          <MedicalCardModal
            child={selectedChild}
            onClose={() => setSelectedChild(null)}
            onArchived={() => {
              setSelectedChild(null);
              void fetchChildren();
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default MedicalCardsTab;
