import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Home, Printer, Search, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { helpArticles } from '../../help/helpCatalog';
import { searchHelpArticles } from '../../help/helpSearch';

const markdownComponents = {
  h1: ({ children }: React.ComponentPropsWithoutRef<'h1'>) => <h1 className="mb-6 text-3xl font-bold text-gray-900">{children}</h1>,
  h2: ({ children }: React.ComponentPropsWithoutRef<'h2'>) => <h2 className="mb-3 mt-8 border-b border-warm-100 pb-2 text-xl font-semibold text-gray-900">{children}</h2>,
  h3: ({ children }: React.ComponentPropsWithoutRef<'h3'>) => <h3 className="mb-2 mt-6 text-lg font-semibold text-gray-800">{children}</h3>,
  p: ({ children }: React.ComponentPropsWithoutRef<'p'>) => <p className="my-3 leading-7 text-gray-700">{children}</p>,
  ul: ({ children }: React.ComponentPropsWithoutRef<'ul'>) => <ul className="my-4 list-disc space-y-2 pl-6 text-gray-700">{children}</ul>,
  ol: ({ children }: React.ComponentPropsWithoutRef<'ol'>) => <ol className="my-4 list-decimal space-y-2 pl-6 text-gray-700 marker:font-semibold marker:text-warm-600">{children}</ol>,
  li: ({ children }: React.ComponentPropsWithoutRef<'li'>) => <li className="pl-1 leading-7">{children}</li>,
  strong: ({ children }: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-semibold text-gray-900">{children}</strong>,
  blockquote: ({ children }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="my-5 rounded-r-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-3 text-amber-950">{children}</blockquote>
  ),
};

const DocumentationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const selectedId = searchParams.get('article');
  const selectedArticle = helpArticles.find((article) => article.id === selectedId) ?? null;
  const filteredArticles = useMemo(() => searchHelpArticles(helpArticles, query), [query]);

  const openArticle = (id: string) => setSearchParams({ article: id });
  const showCatalog = () => setSearchParams({});

  return (
    <div className="mx-auto max-w-7xl print:max-w-none">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => selectedArticle ? showCatalog() : navigate('/about')}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-warm-600"
        >
          <ArrowLeft size={17} />
          {selectedArticle ? 'До змісту' : 'Про програму'}
        </button>
        {selectedArticle && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-4 py-2 text-sm font-medium text-warm-700 shadow-sm transition hover:bg-warm-50"
          >
            <Printer size={17} />
            Друкувати главу
          </button>
        )}
      </div>

      <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-warm-600 via-warm-500 to-amber-400 p-6 text-white shadow-lg print:hidden md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><BookOpen size={30} /></div>
          <div className="min-w-0">
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Центр допомоги</p>
            <h1 className="text-2xl font-bold md:text-3xl">Як користуватися SADOK</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
              Покрокові інструкції для налаштування, щоденної роботи, резервного копіювання та вирішення проблем.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] print:block">
        <aside className="self-start rounded-2xl border border-warm-100 bg-white p-4 shadow-sm print:hidden lg:sticky lg:top-20">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пошук: меню, копія, ліцензія..."
              className="w-full rounded-xl border border-gray-200 bg-warm-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-warm-400 focus:ring-2 focus:ring-warm-100"
            />
          </label>
          <p className="mb-2 mt-4 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {query ? `Знайдено: ${filteredArticles.length}` : `${helpArticles.length} глав`}
          </p>
          <nav className="max-h-[calc(100vh-19rem)] space-y-1 overflow-y-auto pr-1">
            {filteredArticles.map((article) => (
              <button
                type="button"
                key={article.id}
                onClick={() => openArticle(article.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selectedArticle?.id === article.id ? 'bg-warm-100 font-semibold text-warm-700' : 'text-gray-600 hover:bg-warm-50 hover:text-warm-700'}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-warm-600 shadow-sm">{article.number}</span>
                <span className="min-w-0 flex-1 leading-5">{article.title}</span>
              </button>
            ))}
          </nav>
          {!filteredArticles.length && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">Нічого не знайдено. Спробуйте коротший запит.</div>
          )}
        </aside>

        <main id="help-print-area" className="min-w-0">
          {selectedArticle ? (
            <article className="rounded-2xl border border-warm-100 bg-white p-6 shadow-sm print:block print:w-full print:border-0 print:p-0 print:shadow-none md:p-9">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warm-600 print:hidden">
                <BookOpen size={15} /> Глава {selectedArticle.number}
              </div>
              <ReactMarkdown components={markdownComponents}>{selectedArticle.content}</ReactMarkdown>
              <div className="mt-10 flex items-center justify-between border-t border-warm-100 pt-5 print:hidden">
                <button type="button" onClick={showCatalog} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-warm-700">
                  <Home size={16} /> До змісту
                </button>
                <button type="button" onClick={() => navigate('/about')} className="inline-flex items-center gap-2 text-sm font-medium text-warm-700 hover:text-warm-800">
                  Технічна підтримка <ChevronRight size={16} />
                </button>
              </div>
            </article>
          ) : (
            <section>
              <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={22} />
                  <div>
                    <h2 className="font-semibold text-emerald-900">Інструкція доступна без Інтернету</h2>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">Усі глави зберігаються всередині SADOK. Оберіть тему або скористайтеся пошуком.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredArticles.map((article) => (
                  <button
                    type="button"
                    key={article.id}
                    onClick={() => openArticle(article.id)}
                    className="group rounded-2xl border border-warm-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-warm-300 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm-100 text-sm font-bold text-warm-700">{article.number}</span>
                      <ChevronRight className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-warm-500" size={20} />
                    </div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-warm-700">{article.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{article.description}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DocumentationPage;
