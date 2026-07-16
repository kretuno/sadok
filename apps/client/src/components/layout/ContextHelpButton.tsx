import React from 'react';
import { CircleHelp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getHelpArticleId } from '../../help/contextHelp';

const ContextHelpButton: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const articleId = getHelpArticleId(location.pathname);

  if (!articleId) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/documentation?article=${encodeURIComponent(articleId)}`)}
      title="Відкрити довідку для цього розділу"
      aria-label="Відкрити контекстну довідку"
      className="mr-2 inline-flex h-9 items-center gap-2 rounded-xl border border-warm-100 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:border-warm-300 hover:bg-warm-50 hover:text-warm-700"
    >
      <CircleHelp size={18} />
      <span className="hidden lg:inline">Довідка</span>
    </button>
  );
};

export default ContextHelpButton;
