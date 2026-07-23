import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, PackagePlus, Plus, Printer, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import CustomSelect from '../../components/ui/CustomSelect';
import Modal from '../../components/ui/Modal';
import type { KindergartenSettings } from '../../contexts/SettingsContext';
import type { ProductOption, RecipeDetails, RecipeSummary } from './menuTypes';

interface IngredientRow {
  sourceType: 'product' | 'recipe';
  sourceId: string;
  ageGroup: string;
  grossWeight: string;
  netWeight: string;
}

interface RecipesTabProps {
  recipes: RecipeSummary[];
  products: ProductOption[];
  onSaved: () => void | Promise<void>;
  onError: (message: string) => void;
  settings: KindergartenSettings | null;
  canPrint: boolean;
}

const emptyRecipeForm = () => ({
  name: '',
  dishType: '',
  outputWeight: '',
  techCard: '',
  isBaseRecipe: false,
});

const emptyIngredient = (): IngredientRow => ({
  sourceType: 'product',
  sourceId: '',
  ageGroup: 'common',
  grossWeight: '',
  netWeight: '',
});

const formatMoney = (value: number) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value || 0);

const RecipesTab: React.FC<RecipesTabProps> = ({ recipes, products, onSaved, onError, settings, canPrint }) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [loadedRecipeId, setLoadedRecipeId] = useState<number | null>(null);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([emptyIngredient()]);
  const [saving, setSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetails | null>(null);
  const [techCardPreview, setTechCardPreview] = useState<RecipeDetails | null>(null);

  // Створення власного продукту
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    unit: 'кг',
    category: '',
    notes: '',
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const techCardFrameRef = useRef<HTMLIFrameElement | null>(null);
  const techCardFrameRootRef = useRef<{ unmount: () => void } | null>(null);

  const resetEditor = () => {
    setSelectedRecipeId(null);
    setLoadedRecipeId(null);
    setRecipeForm(emptyRecipeForm());
    setIngredientRows([emptyIngredient()]);
    setRecipeDetails(null);
  };

  const openNewRecipe = () => {
    resetEditor();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    resetEditor();
    setIsEditorOpen(false);
  };

  const openCreateProductModal = (rowIndex?: number) => {
    setTargetRowIndex(rowIndex !== undefined ? rowIndex : null);
    setNewProductForm({
      name: '',
      unit: 'кг',
      category: '',
      notes: '',
    });
    setIsCreateProductModalOpen(true);
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      onError('Введіть назву продукту');
      return;
    }
    if (!newProductForm.unit.trim()) {
      onError('Вкажіть одиницю виміру');
      return;
    }

    setCreatingProduct(true);
    try {
      const res = await api.post('/products', {
        name: newProductForm.name.trim(),
        unit: newProductForm.unit.trim(),
        category: newProductForm.category.trim() || undefined,
        notes: newProductForm.notes.trim() || undefined,
      });

      const createdProduct = res.data;
      await onSaved();

      if (targetRowIndex !== null && targetRowIndex >= 0) {
        setIngredientRows((rows) =>
          rows.map((row, idx) =>
            idx === targetRowIndex
              ? { ...row, sourceType: 'product', sourceId: String(createdProduct.id) }
              : row
          )
        );
      } else {
        setIngredientRows((rows) => [
          ...rows,
          {
            sourceType: 'product',
            sourceId: String(createdProduct.id),
            ageGroup: 'common',
            grossWeight: '',
            netWeight: '',
          },
        ]);
      }

      setIsCreateProductModalOpen(false);
    } catch (err: any) {
      onError(err.response?.data?.message || 'Помилка при створенні продукту');
    } finally {
      setCreatingProduct(false);
    }
  };

  useEffect(() => {
    if (!selectedRecipeId) return;
    let active = true;

    void api.get<RecipeDetails>(`/recipes/${selectedRecipeId}`).then((response) => {
      if (!active) return;
      const details = response.data;
      setRecipeForm({
        name: details.recipe.name,
        dishType: details.recipe.dishType || '',
        outputWeight: String(details.recipe.outputWeight || ''),
        techCard: details.recipe.techCard || '',
        isBaseRecipe: details.recipe.isBaseRecipe,
      });
      setIngredientRows(details.ingredients.map((ingredient) => ({
        sourceType: ingredient.productId ? 'product' : 'recipe',
        sourceId: String(ingredient.productId || ingredient.subRecipeId || ''),
        ageGroup: ingredient.ageGroup,
        grossWeight: String(ingredient.grossWeight),
        netWeight: String(ingredient.netWeight),
      })));
      setRecipeDetails(details);
      setLoadedRecipeId(selectedRecipeId);
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(() => {
      if (active) onError('Не вдалося завантажити рецепт');
    });

    return () => {
      active = false;
    };
  }, [selectedRecipeId, onError]);

  useEffect(() => {
    if (!techCardPreview || !techCardFrameRef.current) return;
    const iframe = techCardFrameRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write('<html><head><title>Технологічна карта</title><style>html,body{margin:0;background:#fff;font-family:"Times New Roman",serif}</style></head><body><div id="print-root"></div></body></html>');
    doc.close();
    const container = doc.getElementById('print-root');
    if (!container) return;
    let cancelled = false;
    void Promise.all([import('react-dom/client'), import('../../components/ui/PrintRecipeTechCard')]).then(([{ createRoot }, module]) => {
      if (cancelled) return;
      techCardFrameRootRef.current?.unmount();
      const root = createRoot(container);
      techCardFrameRootRef.current = root;
      root.render(<module.default data={techCardPreview} settings={settings} />);
    });
    return () => {
      cancelled = true;
      const root = techCardFrameRootRef.current;
      techCardFrameRootRef.current = null;
      if (root) queueMicrotask(() => root.unmount());
    };
  }, [settings, techCardPreview]);

  const saveRecipe = async () => {
    if (selectedRecipeId && loadedRecipeId !== selectedRecipeId) {
      onError('Зачекайте, поки рецепт завантажиться');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...recipeForm,
        outputWeight: Number(recipeForm.outputWeight),
        ingredients: ingredientRows.map((row) => ({
          productId: row.sourceType === 'product' ? Number(row.sourceId) : undefined,
          subRecipeId: row.sourceType === 'recipe' ? Number(row.sourceId) : undefined,
          ageGroup: row.ageGroup,
          grossWeight: Number(row.grossWeight),
          netWeight: Number(row.netWeight || row.grossWeight),
        })),
      };

      if (selectedRecipeId) {
        await api.put(`/recipes/${selectedRecipeId}`, payload);
      } else {
        await api.post('/recipes', payload);
      }
    } catch {
      onError('Помилка збереження рецепта');
      setSaving(false);
      return;
    }

    try {
      await onSaved();
      closeEditor();
    } catch {
      onError('Рецепт збережено, але список не вдалося оновити');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {!isEditorOpen && (
      <div className="rounded-3xl border border-warm-100 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">База рецептів</h3>
          <div className="flex gap-2">
            <button onClick={openNewRecipe} className="ui-button-primary px-4 py-2 text-sm">
              <Plus size={16} /> Новий рецепт
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => {
                if (recipe.id !== selectedRecipeId) {
                  setLoadedRecipeId(null);
                  setSelectedRecipeId(recipe.id);
                  setIsEditorOpen(true);
                }
              }}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedRecipeId === recipe.id ? 'border-warm-500 bg-warm-50' : 'border-warm-100 hover:bg-warm-50/50'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-gray-800">{recipe.name}</div>
                  <div className="mt-0.5 text-xs font-black uppercase tracking-tighter text-gray-400">
                    {recipe.dishType || 'Страва'} • {recipe.ingredientsCount} інгр.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-warm-500">{formatMoney(recipe.cost.byAgeGroup['5-7'])}</div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">на дитину</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {isEditorOpen && (
      <div ref={editorRef} className="mx-auto max-w-5xl rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={closeEditor} className="ui-button-secondary px-3 py-2 text-sm">
              <ArrowLeft size={16} /> До бази рецептів
            </button>
            <h3 className="text-xl font-bold text-gray-800">{selectedRecipeId ? 'Редагування рецепта' : 'Створення рецепта'}</h3>
          </div>
          {canPrint && recipeDetails && <button type="button" onClick={() => setTechCardPreview(recipeDetails)} className="ui-button-secondary px-4 py-2 text-sm"><FileText size={16} /> Технологічна карта</button>}
        </div>
        <form className="space-y-4">
          <input value={recipeForm.name} onChange={(event) => setRecipeForm({ ...recipeForm, name: event.target.value })} placeholder="Назва рецепта" className="ui-input font-bold" />
          <div className="grid grid-cols-2 gap-3">
            <input value={recipeForm.dishType} onChange={(event) => setRecipeForm({ ...recipeForm, dishType: event.target.value })} placeholder="Тип страви" className="ui-input text-sm" />
            <input value={recipeForm.outputWeight} onChange={(event) => setRecipeForm({ ...recipeForm, outputWeight: event.target.value })} placeholder="Вихід, г" className="ui-input text-sm" />
          </div>
          <textarea value={recipeForm.techCard} onChange={(event) => setRecipeForm({ ...recipeForm, techCard: event.target.value })} placeholder="Технологія приготування" className="ui-input min-h-28 resize-y text-sm" />

          <div className="border-t border-warm-100 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Інгредієнти</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateProductModal()}
                  className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-warm-50 px-2.5 py-1 text-xs font-bold text-warm-700 transition hover:bg-warm-100"
                  title="Створити новий продукт, якщо його немає в довіднику"
                >
                  <PackagePlus size={14} className="text-warm-600" />
                  <span>+ Новий продукт</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIngredientRows([...ingredientRows, emptyIngredient()])}
                  className="text-warm-500 hover:text-warm-600 p-1"
                  title="Додати інгредієнт"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {ingredientRows.map((ingredient, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-warm-100 bg-warm-50/50 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <CustomSelect
                      options={[
                        { id: 'product', name: 'Продукт' },
                        { id: 'recipe', name: 'Напівфабрикат' },
                      ]}
                      value={ingredient.sourceType}
                      onChange={(value) => setIngredientRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
                        ...row,
                        sourceType: String(value) as IngredientRow['sourceType'],
                        sourceId: '',
                      } : row))}
                    />
                    <button
                      type="button"
                      onClick={() => setIngredientRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Видалити інгредієнт"
                      aria-label="Видалити інгредієнт"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div>
                    <CustomSelect
                      options={ingredient.sourceType === 'product' ? products : recipes.filter((recipe) => recipe.id !== selectedRecipeId)}
                      value={ingredient.sourceId}
                      onChange={(value) => setIngredientRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, sourceId: String(value) } : row))}
                      optionsClassName="max-h-[50vh]"
                      actionOption={ingredient.sourceType === 'product' ? {
                        label: '+ Додати свій продукт',
                        onSelect: () => openCreateProductModal(index),
                      } : undefined}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="Брутто, г"
                      value={ingredient.grossWeight}
                      onChange={(event) => setIngredientRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, grossWeight: event.target.value } : row))}
                      className="ui-input text-xs"
                    />
                    <input
                      placeholder="Нетто, г"
                      value={ingredient.netWeight}
                      onChange={(event) => setIngredientRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, netWeight: event.target.value } : row))}
                      className="ui-input text-xs"
                    />
                    <CustomSelect
                      options={[
                        { id: 'common', name: 'Загальна' },
                        { id: '0-4', name: '0-4' },
                        { id: '5-7', name: '5-7' },
                      ]}
                      value={ingredient.ageGroup}
                      onChange={(value) => setIngredientRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ageGroup: String(value) } : row))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => void saveRecipe()} disabled={saving || Boolean(selectedRecipeId && loadedRecipeId !== selectedRecipeId)} className="ui-button-primary mt-4 w-full py-3">
            {saving ? 'Збереження...' : selectedRecipeId && loadedRecipeId !== selectedRecipeId ? 'Завантаження...' : selectedRecipeId ? 'Оновити рецепт' : 'Зберегти рецепт'}
          </button>
        </form>
      </div>
      )}
    </div>
    <Modal isOpen={Boolean(techCardPreview)} onClose={() => setTechCardPreview(null)} title="Технологічна карта" maxWidth="5xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
          <span>Перевірте картку перед друком. Вона використовує актуальні дані рецепта.</span>
          <button type="button" onClick={() => techCardFrameRef.current?.contentWindow?.print()} className="ui-button-primary shrink-0 px-4">
            <Printer size={16} /> Друкувати
          </button>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-warm-50/40 p-3">
          <iframe ref={techCardFrameRef} title="Попередній перегляд технологічної карти" className="h-[calc(100vh-19rem)] min-h-96 w-full rounded-2xl bg-white" />
        </div>
      </div>
    </Modal>

    {/* Модальне вікно створення нового продукту */}
    <Modal
      isOpen={isCreateProductModalOpen}
      onClose={() => setIsCreateProductModalOpen(false)}
      title="Створення нового продукту"
      maxWidth="md"
    >
      <form onSubmit={handleCreateProductSubmit} className="space-y-4 pt-1">
        <p className="text-xs text-gray-500">
          Новий продукт буде збережено до загального довідника складських продуктів та одразу обрано для поточного рецепта.
        </p>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Назва продукту <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newProductForm.name}
            onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
            placeholder="Наприклад: Сир Пармезан 45%"
            className="ui-input text-sm"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Одиниця виміру <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              options={[
                { id: 'кг', name: 'кг (кілограм)' },
                { id: 'г', name: 'г (грам)' },
                { id: 'л', name: 'л (літр)' },
                { id: 'мл', name: 'мл (мілілітр)' },
                { id: 'шт', name: 'шт (штука)' },
                { id: 'пачка', name: 'пачка' },
                { id: 'банка', name: 'банка' },
                { id: 'уп.', name: 'уп. (упаковка)' },
              ]}
              value={newProductForm.unit}
              onChange={(val) => setNewProductForm({ ...newProductForm, unit: String(val) })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Категорія</label>
            <CustomSelect
              options={[
                { id: 'Молочні продукти та масло', name: 'Молочні продукти та масло' },
                { id: 'М\'ясо та птиця', name: 'М\'ясо та птиця' },
                { id: 'Риба та морепродукти', name: 'Риба та морепродукти' },
                { id: 'Овочі та зелень', name: 'Овочі та зелень' },
                { id: 'Фрукти та ягоди', name: 'Фрукти та ягоди' },
                { id: 'Хлібобулочні вироби', name: 'Хлібобулочні вироби' },
                { id: 'Крупи, макарони, бобові', name: 'Крупи, макарони, бобові' },
                { id: 'Цукор, бакалія, спеції', name: 'Цукор, бакалія, спеції' },
                { id: 'Напої та соки', name: 'Напої та соки' },
                { id: 'Жири та олія', name: 'Жири та олія' },
                { id: 'Яйця', name: 'Яйця' },
                { id: 'Інше', name: 'Інше' },
              ]}
              value={newProductForm.category}
              onChange={(val) => setNewProductForm({ ...newProductForm, category: String(val) })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Примітка (необов'язково)</label>
          <input
            type="text"
            value={newProductForm.notes}
            onChange={(e) => setNewProductForm({ ...newProductForm, notes: e.target.value })}
            placeholder="Особливості зберігання, ДСТУ тощо"
            className="ui-input text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsCreateProductModalOpen(false)}
            className="ui-button-secondary py-2 px-4 text-xs"
            disabled={creatingProduct}
          >
            Скасувати
          </button>
          <button
            type="submit"
            className="ui-button-primary py-2 px-4 text-xs shadow-sm"
            disabled={creatingProduct}
          >
            {creatingProduct ? 'Створення...' : 'Створити та вибрати'}
          </button>
        </div>
      </form>
    </Modal>
    </>
  );
};

export default RecipesTab;
