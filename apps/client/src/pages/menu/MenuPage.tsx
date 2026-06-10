import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  ClipboardList,
  Clock,
  Coffee,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Soup,
  Sandwich,
  Trash2,
  Utensils,
  FileText,
  Copy,
} from 'lucide-react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { uk } from 'date-fns/locale';
import api from '../../api/axios';
import CustomSelect from '../../components/ui/CustomSelect';
import Modal from '../../components/ui/Modal';
import { useSettings } from '../../contexts/SettingsContext';

type Phase4Tab = 'recipes' | 'dailyMenu';

const mealTypes = [
  { id: 'breakfast', name: 'Сніданок', icon: <Coffee size={16} /> },
  { id: 'lunch', name: 'Обід', icon: <Soup size={16} /> },
  { id: 'snack', name: 'Полуденок', icon: <Sandwich size={16} /> },
  { id: 'dinner', name: 'Вечеря', icon: <Utensils size={16} /> },
];

const formatIngredientUnit = (unit: string) => {
  if (unit === 'кг') return 'г';
  if (unit === 'л') return 'мл';
  return unit;
};

interface ProductOption {
  id: number;
  name: string;
  unit: string;
  currentPrice: number;
}

interface SupplierOption {
  id: number;
  name: string;
}

interface MissingStockItem {
  productId: number;
  productName: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
}

interface RestockItemForm {
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

interface RecipeSummary {
  id: number;
  name: string;
  dishType?: string | null;
  outputWeight: number;
  isBaseRecipe: boolean;
  ingredientsCount: number;
  cost: {
    byAgeGroup: Record<string, number>;
  };
}

interface RecipeDetails {
  recipe: {
    id: number;
    name: string;
    dishType?: string | null;
    techCard?: string | null;
    outputWeight: number;
    isBaseRecipe: boolean;
  };
  ingredients: Array<{
    id: number;
    productId?: number | null;
    subRecipeId?: number | null;
    ageGroup: string;
    grossWeight: number;
    netWeight: number;
  }>;
  cost: {
    common: number;
    byAgeGroup: Record<string, number>;
    costPer100g: Record<string, number>;
    lines: any[];
  };
}

interface DailyMenuSummary {
  id: number;
  date: string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  targetPrice0_4?: number | null;
  targetPrice5_7?: number | null;
  isConfirmed: boolean;
  itemsCount: number;
  hasAdjustments: boolean;
  status: 'empty' | 'draft' | 'adjusted' | 'confirmed';
}

interface MenuIngredientAdjustmentRow {
  recipeIngredientId: number | null;
  productId?: number | null;
  subRecipeId?: number | null;
  sourceType: 'product' | 'recipe';
  sourceName: string;
  ageGroup: string;
  unit: string;
  defaultWeight: number;
  weight: string;
  isAdjusted: boolean;
}

interface MenuItemRow {
  id?: number;
  recipeId: string;
  mealType: string;
  outputWeight0_4: string;
  outputWeight5_7: string;
  outputWeightEmployees: string;
  adjustments?: MenuIngredientAdjustmentRow[];
  adjustmentsExpanded?: boolean;
}

interface MenuAnalysis {
  id: number;
  date: string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  targetPrice0_4?: number | null;
  targetPrice5_7?: number | null;
  isConfirmed: boolean;
  status: 'empty' | 'draft' | 'adjusted' | 'confirmed';
  hasAdjustments: boolean;
  itemsCount: number;
  items?: Array<{
    id: number;
    mealType: string;
    mealTypeLabel: string;
    recipeId: number;
    recipeName: string;
    recipeDishType?: string | null;
    defaultOutputWeight: number;
    outputWeight0_4?: number | null;
    outputWeight5_7?: number | null;
    outputWeightEmployees?: number | null;
    hasAdjustments: boolean;
    adjustmentsCount: number;
    ingredientAdjustments: Array<{
      recipeIngredientId: number;
      ageGroup: string;
      sourceType: 'product' | 'recipe';
      sourceName: string;
      unit: string;
      defaultGrossWeight: number;
      defaultNetWeight: number;
      effectiveGrossWeight: number;
      effectiveNetWeight: number;
      isAdjusted: boolean;
    }>;
    productBreakdown: Array<{
      productId: number;
      productName: string;
      unit: string;
      grossQuantity0_4: number;
      grossQuantity5_7: number;
      grossQuantityEmployees: number;
      netQuantity0_4: number;
      netQuantity5_7: number;
      netQuantityEmployees: number;
      totalGrossQuantity: number;
      totalNetQuantity: number;
      unitPrice: number;
      cost0_4: number;
      cost5_7: number;
      costEmployees: number;
      totalCost: number;
    }>;
    cost0_4: number;
    cost5_7: number;
    costEmployees: number;
  }>;
  summaryNeeds?: Array<{
    productId: number;
    productName: string;
    unit: string;
    grossQuantity0_4: number;
    grossQuantity5_7: number;
    grossQuantityEmployees: number;
    netQuantity0_4: number;
    netQuantity5_7: number;
    netQuantityEmployees: number;
    totalGrossQuantity: number;
    totalNetQuantity: number;
    unitPrice: number;
    cost0_4: number;
    cost5_7: number;
    costEmployees: number;
    totalCost: number;
  }>;
  totals?: {
    totalChildren: number;
    totalEmployees: number;
    costPerChild0_4: number;
    costPerChild5_7: number;
    costPerEmployee: number;
    totalCost0_4: number;
    totalCost5_7: number;
    totalCostEmployees: number;
    totalCostAll: number;
  };
}

const emptyMenuItemRow = (mealType: string): MenuItemRow => ({
  mealType,
  recipeId: '',
  outputWeight0_4: '',
  outputWeight5_7: '',
  outputWeightEmployees: '',
  adjustments: [],
  adjustmentsExpanded: false,
});

const SUSPICIOUS_COST_SHARE = 0.4;

type ConfirmAction = {
  type: 'confirmMenu' | 'cancelConfirmation';
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'emerald' | 'red';
};

const MenuPage: React.FC = () => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<Phase4Tab>('dailyMenu');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    dishType: '',
    outputWeight: '',
    techCard: '',
    isBaseRecipe: false,
  });
  const [ingredientRows, setIngredientRows] = useState<any[]>([
    { sourceType: 'product', sourceId: '', ageGroup: 'common', weight: '' },
  ]);
  const [addingIngredientToRowIdx, setAddingIngredientToRowIdx] = useState<number | null>(null);
  const [newIngredientForm, setNewIngredientForm] = useState<{
    productId: string;
    ageGroup: string;
    weight: string;
  }>({ productId: '', ageGroup: 'common', weight: '' });

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [weekMenus, setWeekMenus] = useState<DailyMenuSummary[]>([]);
  const [menuForm, setMenuForm] = useState({
    childrenCount0_4: '0',
    childrenCount5_7: '0',
    employeesCount: '0',
    targetPrice0_4: '50',
    targetPrice5_7: '65',
    isConfirmed: false,
  });
  const [menuItemRows, setMenuItemRows] = useState<MenuItemRow[]>([]);
  const [currentMenuId, setCurrentMenuId] = useState<number | null>(null);
  const [menuAnalysis, setMenuAnalysis] = useState<MenuAnalysis | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<MenuAnalysis | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [lastExactCalculationAt, setLastExactCalculationAt] = useState<Date | null>(null);
  const [hasUnsavedMenuChanges, setHasUnsavedMenuChanges] = useState(false);
  const [missingStockItems, setMissingStockItems] = useState<MissingStockItem[]>([]);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isManualRestockModalOpen, setIsManualRestockModalOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<{ type: 'parents' | 'kitchen' | 'requirement'; data: any } | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // Копіювання меню з іншої дати
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  const [restockForm, setRestockForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().slice(0, 10),
    supplierId: '',
    supplierName: '',
  });
  const [restockItems, setRestockItems] = useState<RestockItemForm[]>([]);
  const [manualRestockReason, setManualRestockReason] = useState('');
  const recipeEditorRef = useRef<HTMLDivElement | null>(null);
  const previewRequestIdRef = useRef(0);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const printFrameRootRef = useRef<{ unmount: () => void } | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: includeWeekends ? 7 : 5 }).map((_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart, includeWeekends]
  );

  useEffect(() => {
    void loadBootstrapData();
  }, []);

  useEffect(() => {
    void loadWeekMenus();
    void loadCurrentMenu();
  }, [selectedDate, currentWeekStart, activeTab]);

  useEffect(() => {
    if (selectedRecipeId) {
      void loadRecipeDetails(selectedRecipeId);
    }
  }, [selectedRecipeId]);

  useEffect(() => {
    if (activeTab === 'recipes' && recipeEditorRef.current) {
      recipeEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab, selectedRecipeId]);

  useEffect(() => {
    if (activeTab !== 'dailyMenu' || menuForm.isConfirmed || !hasUnsavedMenuChanges || menuItemRows.filter((row) => row.recipeId).length === 0) {
      setIsPreviewing(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handlePreviewMenu(true);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTab,
    hasUnsavedMenuChanges,
    menuForm.isConfirmed,
    menuForm.childrenCount0_4,
    menuForm.childrenCount5_7,
    menuForm.employeesCount,
    menuForm.targetPrice0_4,
    menuForm.targetPrice5_7,
    menuItemRows,
  ]);

  useEffect(() => {
    if (!printPreview || !printFrameRef.current) {
      return;
    }

    const iframe = printFrameRef.current;
    const doc = iframe.contentDocument;
    if (!doc) {
      return;
    }

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Друк меню</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
              html, body { width: 100%; height: auto; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Times New Roman', serif;
            }
            body {
              font-size: 11px;
              line-height: 1.2;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 2px solid #000000;
            }
            th, td {
              border: 1.5px solid #000000;
              padding: 4px 6px;
              vertical-align: top;
              word-break: break-word;
            }
            th {
              font-weight: 700;
              background: #f3f4f6;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    doc.close();

    const container = doc.getElementById('print-root');
    if (!container) {
      return;
    }

    let isCancelled = false;

    const renderPrintPreview = async () => {
      const [{ createRoot }, printMenuModule] = await Promise.all([
        import('react-dom/client'),
        import('../../components/ui/PrintMenu'),
      ]);

      if (isCancelled) {
        return;
      }

      printFrameRootRef.current?.unmount();
      const root = createRoot(container);
      printFrameRootRef.current = root;
      root.render(
        <printMenuModule.default
          data={printPreview.data}
          type={printPreview.type}
          settings={settings}
        />,
      );
    };

    void renderPrintPreview();

    return () => {
      isCancelled = true;
      printFrameRootRef.current?.unmount();
      printFrameRootRef.current = null;
    };
  }, [printPreview, settings]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);

  const formatQty = (value: number) => value.toFixed(3);
  const formatCalculationTime = (value: Date) =>
    new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(value);

  const getScaledRecipeCost = (
    recipe: RecipeSummary | undefined,
    row: MenuItemRow,
    ageGroup: '0-4' | '5-7' | 'employees'
  ) => {
    if (!recipe) {
      return 0;
    }

    const recipeAgeGroup = ageGroup === 'employees' ? '5-7' : ageGroup;
    const baseCost = Number(recipe.cost.byAgeGroup[recipeAgeGroup] || 0);
    const defaultOutputWeight = Number(recipe.outputWeight || 0);
    const selectedOutputWeight = ageGroup === '0-4'
      ? Number(row.outputWeight0_4 || recipe.outputWeight || 0)
      : ageGroup === '5-7'
        ? Number(row.outputWeight5_7 || recipe.outputWeight || 0)
        : Number(row.outputWeightEmployees || recipe.outputWeight || 0);

    if (defaultOutputWeight > 0 && selectedOutputWeight > 0) {
      return baseCost * (selectedOutputWeight / defaultOutputWeight);
    }

    return baseCost;
  };

  const approximateMenuCost = useMemo(() => {
    let cost0_4 = 0;
    let cost5_7 = 0;
    let costEmployees = 0;

    menuItemRows.forEach((row) => {
      const recipe = recipes.find((item) => item.id === Number(row.recipeId));
      if (!recipe) {
        return;
      }

      cost0_4 += getScaledRecipeCost(recipe, row, '0-4');
      cost5_7 += getScaledRecipeCost(recipe, row, '5-7');
      costEmployees += getScaledRecipeCost(recipe, row, 'employees');
    });

    return {
      cost0_4,
      cost5_7,
      costEmployees,
      totalCostAll: (
        cost0_4 * Number(menuForm.childrenCount0_4) +
        cost5_7 * Number(menuForm.childrenCount5_7) +
        costEmployees * Number(menuForm.employeesCount)
      ),
    };
  }, [menuItemRows, recipes, menuForm.childrenCount0_4, menuForm.childrenCount5_7, menuForm.employeesCount]);

  const effectiveMenuAnalysis = hasUnsavedMenuChanges ? previewAnalysis : menuAnalysis;

  const displayedTotals = effectiveMenuAnalysis?.totals
    ? {
      cost0_4: effectiveMenuAnalysis.totals.costPerChild0_4,
      cost5_7: effectiveMenuAnalysis.totals.costPerChild5_7,
      costEmployees: effectiveMenuAnalysis.totals.costPerEmployee,
      totalCostAll: effectiveMenuAnalysis.totals.totalCostAll,
    }
    : approximateMenuCost;

  const analysisTotals = effectiveMenuAnalysis?.totals
    ? effectiveMenuAnalysis.totals
    : {
      totalChildren: Number(menuForm.childrenCount0_4) + Number(menuForm.childrenCount5_7),
      totalEmployees: Number(menuForm.employeesCount),
      costPerChild0_4: displayedTotals.cost0_4,
      costPerChild5_7: displayedTotals.cost5_7,
      costPerEmployee: (displayedTotals as any).costEmployees ?? 0,
      totalCost0_4: displayedTotals.cost0_4 * Number(menuForm.childrenCount0_4),
      totalCost5_7: displayedTotals.cost5_7 * Number(menuForm.childrenCount5_7),
      totalCostEmployees: ((displayedTotals as any).costEmployees ?? 0) * Number(menuForm.employeesCount),
      totalCostAll: displayedTotals.totalCostAll,
    };
  const effectiveMenuItems = effectiveMenuAnalysis?.items ?? [];
  const effectiveSummaryNeeds = effectiveMenuAnalysis?.summaryNeeds ?? [];

  const menuCostAlerts = useMemo(() => {
    if (!effectiveMenuAnalysis || effectiveMenuItems.length === 0) {
      return {
        dayAlerts: [] as string[],
        expensiveItems: [] as Array<{
          id: number;
          recipeName: string;
          share0_4: number;
          share5_7: number;
          cost0_4PerChild: number;
          cost5_7PerChild: number;
        }>,
      };
    }

    const count0_4 = Number(menuForm.childrenCount0_4);
    const count5_7 = Number(menuForm.childrenCount5_7);
    const expensiveItems = effectiveMenuItems
      .map((item) => {
        const perChild0_4 = count0_4 > 0 ? item.cost0_4 / count0_4 : 0;
        const perChild5_7 = count5_7 > 0 ? item.cost5_7 / count5_7 : 0;
        const share0_4 = analysisTotals.totalCost0_4 > 0 ? item.cost0_4 / analysisTotals.totalCost0_4 : 0;
        const share5_7 = analysisTotals.totalCost5_7 > 0 ? item.cost5_7 / analysisTotals.totalCost5_7 : 0;

        return {
          id: item.id,
          recipeName: item.recipeName,
          share0_4,
          share5_7,
          cost0_4PerChild: perChild0_4,
          cost5_7PerChild: perChild5_7,
        };
      })
      .filter((item) => item.share0_4 >= 0.35 || item.share5_7 >= 0.35)
      .sort((a, b) => Math.max(b.share0_4, b.share5_7) - Math.max(a.share0_4, a.share5_7));

    const dayAlerts: string[] = [];
    const target0_4 = Number(menuForm.targetPrice0_4);
    const target5_7 = Number(menuForm.targetPrice5_7);

    if (target0_4 > 0 && analysisTotals.costPerChild0_4 > target0_4 * 1.15) {
      dayAlerts.push(`Група 0-4 перевищує ціль більше ніж на 15%: ${formatMoney(analysisTotals.costPerChild0_4)} проти цілі ${formatMoney(target0_4)}.`);
    }
    if (target5_7 > 0 && analysisTotals.costPerChild5_7 > target5_7 * 1.15) {
      dayAlerts.push(`Група 5-7 перевищує ціль більше ніж на 15%: ${formatMoney(analysisTotals.costPerChild5_7)} проти цілі ${formatMoney(target5_7)}.`);
    }
    if (expensiveItems.length > 0) {
      const topItem = expensiveItems[0];
      const dominantShare = Math.max(topItem.share0_4, topItem.share5_7) * 100;
      dayAlerts.push(`Страва "${topItem.recipeName}" формує ${dominantShare.toFixed(0)}% вартості щонайменше однієї вікової групи.`);
    }

    return { dayAlerts, expensiveItems };
  }, [effectiveMenuAnalysis, effectiveMenuItems, menuForm.childrenCount0_4, menuForm.childrenCount5_7, menuForm.targetPrice0_4, menuForm.targetPrice5_7, analysisTotals]);

  const menuCostBreakdown = useMemo(() => {
    if (!effectiveMenuAnalysis) {
      return {
        topDish0_4: [] as Array<{ id: number; name: string; value: number; share: number }>,
        topDish5_7: [] as Array<{ id: number; name: string; value: number; share: number }>,
        topProduct0_4: [] as Array<{ id: number; name: string; value: number; share: number; unit: string }>,
        topProduct5_7: [] as Array<{ id: number; name: string; value: number; share: number; unit: string }>,
      };
    }

    const topDish0_4 = [...effectiveMenuItems]
      .map((item) => ({
        id: item.id,
        name: item.recipeName,
        value: item.cost0_4,
        share: analysisTotals.totalCost0_4 > 0 ? item.cost0_4 / analysisTotals.totalCost0_4 : 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const topDish5_7 = [...effectiveMenuItems]
      .map((item) => ({
        id: item.id,
        name: item.recipeName,
        value: item.cost5_7,
        share: analysisTotals.totalCost5_7 > 0 ? item.cost5_7 / analysisTotals.totalCost5_7 : 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const topProduct0_4 = [...effectiveSummaryNeeds]
      .map((product) => ({
        id: product.productId,
        name: product.productName,
        value: product.cost0_4,
        share: analysisTotals.totalCost0_4 > 0 ? product.cost0_4 / analysisTotals.totalCost0_4 : 0,
        unit: product.unit,
      }))
      .filter((product) => product.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topProduct5_7 = [...effectiveSummaryNeeds]
      .map((product) => ({
        id: product.productId,
        name: product.productName,
        value: product.cost5_7,
        share: analysisTotals.totalCost5_7 > 0 ? product.cost5_7 / analysisTotals.totalCost5_7 : 0,
        unit: product.unit,
      }))
      .filter((product) => product.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      topDish0_4,
      topDish5_7,
      topProduct0_4,
      topProduct5_7,
    };
  }, [effectiveMenuAnalysis, effectiveMenuItems, effectiveSummaryNeeds, analysisTotals]);

  const suspiciousCostFlags = useMemo(() => {
    const suspiciousDishes = [
      ...menuCostBreakdown.topDish0_4
        .filter((item) => item.share >= SUSPICIOUS_COST_SHARE)
        .map((item) => ({ key: `dish-0-4-${item.id}`, label: `${item.name} · страва 0-4`, share: item.share, value: item.value })),
      ...menuCostBreakdown.topDish5_7
        .filter((item) => item.share >= SUSPICIOUS_COST_SHARE)
        .map((item) => ({ key: `dish-5-7-${item.id}`, label: `${item.name} · страва 5-7`, share: item.share, value: item.value })),
    ];

    const suspiciousProducts = [
      ...menuCostBreakdown.topProduct0_4
        .filter((item) => item.share >= SUSPICIOUS_COST_SHARE)
        .map((item) => ({ key: `product-0-4-${item.id}`, label: `${item.name} · продукт 0-4`, share: item.share, value: item.value })),
      ...menuCostBreakdown.topProduct5_7
        .filter((item) => item.share >= SUSPICIOUS_COST_SHARE)
        .map((item) => ({ key: `product-5-7-${item.id}`, label: `${item.name} · продукт 5-7`, share: item.share, value: item.value })),
    ];

    return {
      suspiciousDishes,
      suspiciousProducts,
    };
  }, [menuCostBreakdown]);

  const autoFetchAttendance = async () => {
    try {
      const todayStr = format(selectedDate, 'yyyy-MM-dd');
      const yesterdayStr = format(addDays(selectedDate, -1), 'yyyy-MM-dd');

      const [todayRes, yesterdayRes] = await Promise.all([
        api.get(`/attendance/summary?date=${todayStr}`),
        api.get(`/attendance/summary?date=${yesterdayStr}`),
      ]);

      const today = todayRes.data;
      const yesterday = yesterdayRes.data;

      if (today.count0_4 > 0 || today.count5_7 > 0) {
        setMenuForm((prev) => ({
          ...prev,
          childrenCount0_4: String(today.count0_4),
          childrenCount5_7: String(today.count5_7),
        }));
      } else if (yesterday.count0_4 > 0 || yesterday.count5_7 > 0) {
        setMenuForm((prev) => ({
          ...prev,
          childrenCount0_4: String(yesterday.count0_4),
          childrenCount5_7: String(yesterday.count5_7),
        }));
      }
    } catch (attendanceError) {
      console.error('Не вдалося отримати дані відвідуваності', attendanceError);
    }
  };

  const loadBootstrapData = async () => {
    setBootstrapLoading(true);
    setBootstrapError(null);

    const bootstrapRequests = [
      { key: 'recipes', label: 'рецепти', request: api.get('/recipes') },
      { key: 'products', label: 'продукти', request: api.get('/products') },
      { key: 'suppliers', label: 'постачальники', request: api.get('/suppliers') },
    ] as const;

    try {
      const results = await Promise.allSettled(bootstrapRequests.map((item) => item.request));
      const failedLabels: string[] = [];

      results.forEach((result, index) => {
        const request = bootstrapRequests[index];

        if (result.status === 'fulfilled') {
          if (request.key === 'recipes') {
            setRecipes(result.value.data);
          }
          if (request.key === 'products') {
            setProducts(result.value.data);
          }
          if (request.key === 'suppliers') {
            setSuppliers(result.value.data);
          }
          return;
        }

        failedLabels.push(request.label);
        console.error(`Не вдалося завантажити довідник "${request.label}"`, result.reason);
      });

      if (failedLabels.length > 0) {
        setBootstrapError(
          failedLabels.length === bootstrapRequests.length
            ? 'Не вдалося завантажити дані меню. Перевірте підключення до сервера та повторіть спробу.'
            : `Частина довідників меню недоступна: ${failedLabels.join(', ')}. Повторіть спробу.`
        );
      }
    } finally {
      setBootstrapLoading(false);
    }
  };

  const loadWeekMenus = async () => {
    try {
      const start = format(weekDays[0], 'yyyy-MM-dd');
      const end = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');
      const res = await api.get(`/menus?start=${start}&end=${end}`);
      setWeekMenus(res.data);
    } catch (loadError) {
      console.error(loadError);
    }
  };

  const mapAdjustmentsFromRecipeDetails = (details: RecipeDetails): MenuIngredientAdjustmentRow[] =>
    details.ingredients.map((ingredient) => {
      const isProduct = Boolean(ingredient.productId);
      const product = products.find((item) => item.id === Number(ingredient.productId));
      const recipe = recipes.find((item) => item.id === Number(ingredient.subRecipeId));

      return {
        recipeIngredientId: ingredient.id,
        sourceType: isProduct ? 'product' : 'recipe',
        sourceName: isProduct
          ? product?.name || `Продукт #${ingredient.productId}`
          : recipe?.name || `Рецепт #${ingredient.subRecipeId}`,
        ageGroup: ingredient.ageGroup,
        unit: isProduct ? product?.unit || 'од.' : 'г',
        defaultWeight: Number(ingredient.grossWeight),
        weight: String(ingredient.grossWeight),
        isAdjusted: false,
      };
    });

  const loadCurrentMenu = async () => {
    setError(null);
    setSuccess(null);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get(`/menus?start=${dateStr}&end=${dateStr}`);

      if (res.data.length === 0) {
        setCurrentMenuId(null);
        setMenuAnalysis(null);
        setPreviewAnalysis(null);
        setLastExactCalculationAt(null);
        setHasUnsavedMenuChanges(false);
        setMenuForm({
          childrenCount0_4: '0',
          childrenCount5_7: '0',
          employeesCount: '0',
          targetPrice0_4: '50',
          targetPrice5_7: '65',
          isConfirmed: false,
        });
        setMenuItemRows([]);
        if (activeTab === 'dailyMenu') {
          void autoFetchAttendance();
        }
        return;
      }

      const full = await api.get(`/menus/${res.data[0].id}`);
      const menu: MenuAnalysis = full.data;
      const menuItems = Array.isArray(menu.items) ? menu.items : [];

      setCurrentMenuId(menu.id);
      setMenuAnalysis(menu);
      setPreviewAnalysis(null);
      setLastExactCalculationAt(new Date());
      setHasUnsavedMenuChanges(false);
      setMenuForm({
        childrenCount0_4: String(menu.childrenCount0_4),
        childrenCount5_7: String(menu.childrenCount5_7),
        employeesCount: String(menu.employeesCount ?? '0'),
        targetPrice0_4: String(menu.targetPrice0_4 || '50'),
        targetPrice5_7: String(menu.targetPrice5_7 || '65'),
        isConfirmed: Boolean(menu.isConfirmed),
      });
      setMenuItemRows(
        menuItems.map((item) => ({
          id: item.id,
          recipeId: String(item.recipeId),
          mealType: item.mealType,
          outputWeight0_4: String(item.outputWeight0_4 || ''),
          outputWeight5_7: String(item.outputWeight5_7 || ''),
          outputWeightEmployees: String(item.outputWeightEmployees || ''),
          adjustmentsExpanded: false,
          adjustments: (item.ingredientAdjustments || []).map((adjustment) => ({
            recipeIngredientId: adjustment.recipeIngredientId,
            sourceType: adjustment.sourceType,
            sourceName: adjustment.sourceName,
            ageGroup: adjustment.ageGroup,
            unit: adjustment.unit,
            defaultWeight: adjustment.effectiveGrossWeight,
            weight: String(adjustment.effectiveGrossWeight),
            isAdjusted: adjustment.isAdjusted,
          })),
        }))
      );
    } catch (loadError) {
      console.error(loadError);
    }
  };

  const handleCopyMenuFromDate = async (sourceDateStr: string) => {
    setCopyError(null);
    setCopyLoading(true);

    try {
      const res = await api.get(`/menus?start=${sourceDateStr}&end=${sourceDateStr}`);

      if (res.data.length === 0) {
        setCopyError('На обрану дату немає створеного меню.');
        setCopyLoading(false);
        return;
      }

      const full = await api.get(`/menus/${res.data[0].id}`);
      const menu: MenuAnalysis = full.data;
      const menuItems = Array.isArray(menu.items) ? menu.items : [];

      setMenuForm((prev) => {
        const keepCurrentCounts =
          Number(prev.childrenCount0_4) > 0 ||
          Number(prev.childrenCount5_7) > 0 ||
          Number(prev.employeesCount) > 0;
        return {
          ...prev,
          childrenCount0_4: keepCurrentCounts ? prev.childrenCount0_4 : String(menu.childrenCount0_4),
          childrenCount5_7: keepCurrentCounts ? prev.childrenCount5_7 : String(menu.childrenCount5_7),
          employeesCount: keepCurrentCounts ? prev.employeesCount : String(menu.employeesCount ?? '0'),
          targetPrice0_4: String(menu.targetPrice0_4 || '50'),
          targetPrice5_7: String(menu.targetPrice5_7 || '65'),
          isConfirmed: false,
        };
      });

      setMenuItemRows(
        menuItems.map((item) => ({
          recipeId: String(item.recipeId),
          mealType: item.mealType,
          outputWeight0_4: String(item.outputWeight0_4 || ''),
          outputWeight5_7: String(item.outputWeight5_7 || ''),
          outputWeightEmployees: String(item.outputWeightEmployees || ''),
          adjustmentsExpanded: false,
          adjustments: (item.ingredientAdjustments || []).map((adjustment) => ({
            recipeIngredientId: adjustment.recipeIngredientId,
            sourceType: adjustment.sourceType,
            sourceName: adjustment.sourceName,
            ageGroup: adjustment.ageGroup,
            unit: adjustment.unit,
            defaultWeight: adjustment.effectiveGrossWeight,
            weight: String(adjustment.effectiveGrossWeight),
            isAdjusted: adjustment.isAdjusted,
          })),
        }))
      );

      setHasUnsavedMenuChanges(true);
      setIsCopyModalOpen(false);
      setSuccess('Меню успішно скопійовано. Не забудьте натиснути «Зберегти»!');
    } catch (err: any) {
      console.error(err);
      setCopyError(err.response?.data?.message || 'Не вдалося скопіювати меню.');
    } finally {
      setCopyLoading(false);
    }
  };

  const updateMenuField = (field: keyof typeof menuForm, value: string | boolean) => {
    let sanitizedValue = value;

    if (typeof value === 'string') {
      if (field === 'childrenCount0_4' || field === 'childrenCount5_7' || field === 'employeesCount') {
        sanitizedValue = value.replace(/\D/g, '');
        if (sanitizedValue === '') {
          sanitizedValue = '0';
        } else {
          // Убираем лидирующие нули (например, "05" -> "5")
          sanitizedValue = String(Number(sanitizedValue));
        }
      } else if (field === 'targetPrice0_4' || field === 'targetPrice5_7') {
        sanitizedValue = value.replace(/[^0-9.]/g, '');
        const parts = sanitizedValue.split('.');
        if (parts.length > 2) {
          sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
        }
      }
    }

    setPreviewAnalysis(null);
    setHasUnsavedMenuChanges(true);
    setMenuForm((prev) => ({
      ...prev,
      [field]: sanitizedValue,
    }));
  };

  const updateMenuItemRow = (index: number, updater: (row: MenuItemRow) => MenuItemRow) => {
    setPreviewAnalysis(null);
    setHasUnsavedMenuChanges(true);
    setMenuItemRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? updater(row) : row)));
  };

  const ensureMenuItemAdjustments = async (index: number) => {
    const row = menuItemRows[index];
    if (!row || !row.recipeId) {
      return;
    }

    if (row.adjustments && row.adjustments.length > 0) {
      return;
    }

    const details = await api.get(`/recipes/${row.recipeId}`);
    const mappedAdjustments = mapAdjustmentsFromRecipeDetails(details.data);

    setMenuItemRows((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? {
          ...item,
          adjustments: mappedAdjustments,
        }
        : item
    )));
  };

  const handleSaveMenu = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = buildMenuPayload();

      const response = await api.post('/menus', payload);
      const savedMenu: MenuAnalysis = response.data;

      setCurrentMenuId(savedMenu.id);
      setMenuAnalysis(savedMenu);
      setPreviewAnalysis(null);
      setLastExactCalculationAt(new Date());
      setHasUnsavedMenuChanges(false);
      setMenuForm({
        childrenCount0_4: String(savedMenu.childrenCount0_4),
        childrenCount5_7: String(savedMenu.childrenCount5_7),
        employeesCount: String(savedMenu.employeesCount ?? '0'),
        targetPrice0_4: String(savedMenu.targetPrice0_4 || '50'),
        targetPrice5_7: String(savedMenu.targetPrice5_7 || '65'),
        isConfirmed: Boolean(savedMenu.isConfirmed),
      });
      const savedMenuItems = Array.isArray(savedMenu.items) ? savedMenu.items : [];
      setMenuItemRows(
        savedMenuItems.map((item) => ({
          id: item.id,
          recipeId: String(item.recipeId),
          mealType: item.mealType,
          outputWeight0_4: String(item.outputWeight0_4 || ''),
          outputWeight5_7: String(item.outputWeight5_7 || ''),
          outputWeightEmployees: String(item.outputWeightEmployees || ''),
          adjustmentsExpanded: false,
          adjustments: (item.ingredientAdjustments || []).map((adjustment) => ({
            recipeIngredientId: adjustment.recipeIngredientId,
            sourceType: adjustment.sourceType,
            sourceName: adjustment.sourceName,
            ageGroup: adjustment.ageGroup,
            unit: adjustment.unit,
            defaultWeight: adjustment.effectiveGrossWeight,
            weight: String(adjustment.effectiveGrossWeight),
            isAdjusted: adjustment.isAdjusted,
          })),
        }))
      );

      setSuccess('Меню збережено успішно');
      void loadWeekMenus();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || 'Помилка збереження меню');
    } finally {
      setSaving(false);
    }
  };

  const buildMenuPayload = () => ({
    date: format(selectedDate, 'yyyy-MM-dd'),
    childrenCount0_4: Number(menuForm.childrenCount0_4),
    childrenCount5_7: Number(menuForm.childrenCount5_7),
    employeesCount: Number(menuForm.employeesCount),
    targetPrice0_4: Number(menuForm.targetPrice0_4),
    targetPrice5_7: Number(menuForm.targetPrice5_7),
    items: menuItemRows
      .filter((row) => row.recipeId)
      .map((row) => ({
        recipeId: Number(row.recipeId),
        mealType: row.mealType,
        outputWeight0_4: row.outputWeight0_4 ? Number(row.outputWeight0_4) : null,
        outputWeight5_7: row.outputWeight5_7 ? Number(row.outputWeight5_7) : null,
        outputWeightEmployees: row.outputWeightEmployees ? Number(row.outputWeightEmployees) : null,
        overrides: (row.adjustments || [])
          .filter((adjustment) =>
            adjustment.recipeIngredientId === null ||
            Number(adjustment.weight) !== adjustment.defaultWeight
          )
          .map((adjustment) => ({
            recipeIngredientId: adjustment.recipeIngredientId,
            productId: adjustment.productId || null,
            subRecipeId: adjustment.subRecipeId || null,
            ageGroup: adjustment.ageGroup || 'common',
            grossWeight: Number(adjustment.weight),
            netWeight: Number(adjustment.weight),
          })),
      })),
  });

  const handlePreviewMenu = async (silent = false) => {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setIsPreviewing(true);

    if (!silent) {
      setSaving(true);
      setError(null);
    }

    try {
      const response = await api.post('/menus/preview', buildMenuPayload());

      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      setPreviewAnalysis(response.data);
      setLastExactCalculationAt(new Date());

      if (!silent) {
        setSuccess('Точний попередній перерахунок виконано');
      }
    } catch (previewError: any) {
      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      if (!silent) {
        setError(previewError.response?.data?.message || 'Не вдалося виконати точний перерахунок меню');
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreviewing(false);
      }

      if (!silent) {
        setSaving(false);
      }
    }
  };

  const handleConfirmMenu = () => {
    if (!currentMenuId) {
      setError('Спочатку збережіть меню на цей день');
      return;
    }

    setConfirmAction({
      type: 'confirmMenu',
      title: 'Підтвердження меню',
      message: 'Підтвердити меню на цей день? Це спише продукти зі складу та зафіксує денний документ.',
      confirmLabel: 'Підтвердити',
      tone: 'emerald',
    });
  };

  const executeMenuConfirmation = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!currentMenuId) {
        setError('Спочатку збережіть меню на цей день');
        return;
      }

      await api.post(`/menus/${currentMenuId}/confirm`);
      setMissingStockItems([]);
      setSuccess('Меню підтверджено, списання виконано');
      await loadCurrentMenu();
      await loadWeekMenus();
    } catch (confirmError: any) {
      const shortages = confirmError.response?.data?.shortages;
      if (Array.isArray(shortages) && shortages.length > 0) {
        setMissingStockItems(shortages);
        setRestockItems(
          shortages.map((item: MissingStockItem) => ({
            productId: String(item.productId),
            productName: item.productName,
            unit: item.unit,
            quantity: String(item.missingQuantity),
            unitPrice: String(
              products.find((product) => product.id === item.productId)?.currentPrice || 0
            ),
          }))
        );
        setRestockForm((current) => ({
          ...current,
          invoiceNumber: current.invoiceNumber || `MEN-${format(selectedDate, 'ddMMyy')}`,
          date: format(selectedDate, 'yyyy-MM-dd'),
        }));
        setManualRestockReason(`Ручне поповнення для підтвердження меню від ${format(selectedDate, 'dd.MM.yyyy')}`);
      }
      setError(confirmError.response?.data?.message || 'Помилка підтвердження');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConfirmation = () => {
    if (!currentMenuId) {
      return;
    }

    setConfirmAction({
      type: 'cancelConfirmation',
      title: 'Скасування підтвердження',
      message: 'Скасувати підтвердження меню, повернути продукти на склад і відкрити день для редагування?',
      confirmLabel: 'Скасувати підтвердження',
      tone: 'red',
    });
  };

  const executeCancelConfirmation = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.post(`/menus/${currentMenuId}/cancel-confirmation`);
      setSuccess('Підтвердження меню скасовано, продукти повернуто на склад');
      await loadCurrentMenu();
      await loadWeekMenus();
      await loadBootstrapData();
    } catch (cancelError: any) {
      setError(cancelError.response?.data?.message || 'Не вдалося скасувати підтвердження меню');
    } finally {
      setSaving(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === 'confirmMenu') {
      setConfirmAction(null);
      await executeMenuConfirmation();
      return;
    }

    setConfirmAction(null);
    await executeCancelConfirmation();
  };

  const handleRestockSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/invoices', {
        invoiceNumber: restockForm.invoiceNumber,
        date: restockForm.date,
        supplierId: restockForm.supplierId ? Number(restockForm.supplierId) : undefined,
        supplierName: restockForm.supplierId ? undefined : restockForm.supplierName,
        items: restockItems.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      setIsRestockModalOpen(false);
      setSuccess('Прихідну накладну створено, залишки поповнено');
      await loadBootstrapData();
    } catch (restockError: any) {
      setError(restockError.response?.data?.message || 'Не вдалося створити прихідну накладну');
    } finally {
      setSaving(false);
    }
  };

  const handleManualRestockSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      for (const item of restockItems) {
        await api.post(`/products/${Number(item.productId)}/manual-restock`, {
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          reason: manualRestockReason || `Ручне поповнення для меню від ${format(selectedDate, 'dd.MM.yyyy')}`,
        });
      }

      setIsManualRestockModalOpen(false);
      setSuccess('Залишки поповнено вручну без накладної. Можна повторити підтвердження меню.');
      await loadBootstrapData();
    } catch (restockError: any) {
      setError(restockError.response?.data?.message || 'Не вдалося поповнити залишки вручну');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (type: 'parents' | 'kitchen' | 'requirement') => {
    try {
      if (!currentMenuId) {
        setError('Спочатку збережіть меню на цей день');
        return;
      }

      setIsPreparingPrint(true);
      const printRes = await api.get(`/menus/${currentMenuId}/print`);
      setPrintPreview({ type, data: printRes.data });
    } catch {
      setError('Помилка при підготовці до друку');
    } finally {
      setIsPreparingPrint(false);
    }
  };

  const handlePrintFromPreview = () => {
    const frameWindow = printFrameRef.current?.contentWindow;
    if (!frameWindow) {
      setError('Не вдалося підготувати область друку');
      return;
    }

    frameWindow.focus();
    frameWindow.print();
  };

  const loadRecipeDetails = async (id: number) => {
    const res = await api.get(`/recipes/${id}`);
    setRecipeForm({
      name: res.data.recipe.name,
      dishType: res.data.recipe.dishType || '',
      outputWeight: String(res.data.recipe.outputWeight || ''),
      techCard: res.data.recipe.techCard || '',
      isBaseRecipe: res.data.recipe.isBaseRecipe,
    });
    setIngredientRows(res.data.ingredients.map((ingredient: any) => ({
      sourceType: ingredient.productId ? 'product' : 'recipe',
      sourceId: String(ingredient.productId || ingredient.subRecipeId),
      ageGroup: ingredient.ageGroup,
      weight: String(ingredient.grossWeight),
    })));
  };

  const getDayStatusMeta = (status: DailyMenuSummary['status'] | MenuAnalysis['status']) => {
    if (status === 'confirmed') {
      return {
        label: 'Підтв.',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        card: 'border-emerald-200 bg-emerald-50/50',
      };
    }

    if (status === 'adjusted') {
      return {
        label: 'Є коригування',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        card: 'border-amber-200 bg-amber-50/60',
      };
    }

    if (status === 'draft') {
      return {
        label: 'Чернетка',
        dot: 'bg-warm-500',
        badge: 'bg-warm-50 text-warm-700 border-warm-200',
        card: 'border-warm-200 bg-warm-50/60',
      };
    }

    return {
      label: 'Порожньо',
      dot: 'bg-gray-300',
      badge: 'bg-gray-50 text-gray-500 border-gray-200',
      card: 'border-warm-100 bg-white',
    };
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-500">Фаза 4.2</p>
          <h2 className="text-3xl font-bold text-gray-800">Меню та рецепти</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Планування харчування, денний документ меню, коригування складу на конкретну дату та детальна розкладка продуктів.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-warm-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('dailyMenu')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${activeTab === 'dailyMenu' ? 'bg-warm-500 text-white' : 'bg-warm-50 text-gray-600 hover:bg-warm-100'}`}
          >
            <ClipboardList size={16} /> Меню дня
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${activeTab === 'recipes' ? 'bg-warm-500 text-white' : 'bg-warm-50 text-gray-600 hover:bg-warm-100'}`}
          >
            <ChefHat size={16} /> Рецепти
          </button>
        </div>
      </div>

      {bootstrapError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} />
            {bootstrapError}
          </div>
          <button
            type="button"
            onClick={() => void loadBootstrapData()}
            disabled={bootstrapLoading}
            className="ui-button-secondary px-4 py-2 text-sm"
          >
            <RotateCcw size={16} />
            {bootstrapLoading ? 'Завантаження...' : 'Повторити'}
          </button>
        </div>
      )}

      {(error || success) && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {error || success}
        </div>
      )}

      {missingStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-bold">Для підтвердження меню не вистачає продуктів:</div>
          <div className="mt-2 space-y-1">
            {missingStockItems.map((item) => (
              <div key={item.productId}>
                {item.productName}: потрібно {formatQty(item.requiredQuantity)} {item.unit}, на складі {formatQty(item.availableQuantity)} {item.unit}, бракує {formatQty(item.missingQuantity)} {item.unit}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setIsRestockModalOpen(true)}
              className="ui-button-secondary border-amber-300 px-4 text-amber-800 hover:bg-amber-100"
            >
              <Plus size={16} /> Додати через прихідну накладну
            </button>
          </div>
        </div>
      )}

      {missingStockItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsRestockModalOpen(true)}
            className="ui-button-secondary border-amber-300 px-4 text-amber-800 hover:bg-amber-100"
          >
            <Plus size={16} /> Додати через накладну
          </button>
          <button
            onClick={() => setIsManualRestockModalOpen(true)}
            className="ui-button-secondary border-amber-300 px-4 text-amber-800 hover:bg-amber-100"
          >
            <Plus size={16} /> Додати вручну
          </button>
        </div>
      )}

      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Поповнення залишків для підтвердження меню"
        maxWidth="4xl"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={restockForm.invoiceNumber}
              onChange={(event) => setRestockForm((current) => ({ ...current, invoiceNumber: event.target.value }))}
              placeholder="Номер накладної"
              className="ui-input"
            />
            <input
              type="date"
              value={restockForm.date}
              onChange={(event) => setRestockForm((current) => ({ ...current, date: event.target.value }))}
              className="ui-input"
            />
            <CustomSelect
              options={[{ id: '', name: 'Новий постачальник' }, ...suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))]}
              value={restockForm.supplierId}
              onChange={(value) => setRestockForm((current) => ({ ...current, supplierId: String(value) }))}
              placeholder="Постачальник"
            />
          </div>

          {!restockForm.supplierId && (
            <input
              value={restockForm.supplierName}
              onChange={(event) => setRestockForm((current) => ({ ...current, supplierName: event.target.value }))}
              placeholder="Назва нового постачальника"
              className="ui-input"
            />
          )}

          <div className="space-y-3">
            <div className="grid gap-3 px-1 text-[11px] font-black uppercase tracking-wider text-gray-400 md:grid-cols-[1.8fr_0.7fr_0.8fr_0.9fr]">
              <div>Продукт</div>
              <div>Од. виміру</div>
              <div>Кількість</div>
              <div>Ціна за од.</div>
            </div>
            {restockItems.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="grid gap-3 rounded-2xl border border-warm-100 bg-warm-50/50 p-4 md:grid-cols-[1.8fr_0.7fr_0.8fr_0.9fr]">
                <div>
                  <div className="font-bold text-gray-800">{item.productName}</div>
                  <div className="text-xs text-gray-500">Продукт буде додано в склад і одразу стане доступним для підтвердження меню.</div>
                </div>
                <input
                  value={item.unit}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row))}
                  placeholder="Од."
                  className="ui-input"
                />
                <input
                  value={item.quantity}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))}
                  placeholder="Кількість"
                  className="ui-input"
                />
                <input
                  value={item.unitPrice}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: event.target.value } : row))}
                  placeholder="Ціна"
                  className="ui-input"
                />
              </div>
            ))}
          </div>

          <button type="submit" className="ui-button-primary w-full py-3">
            Провести прихідну накладну
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Копіювання меню з іншої дати"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCopyMenuFromDate(copySourceDate);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-500">
            Виберіть дату, з якої ви хочете повністю скопіювати меню (страви, виходи порцій та ручні коригування інгредієнтів) в поточний обраний день.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Дата-джерело</label>
            <input
              type="date"
              value={copySourceDate}
              onChange={(e) => setCopySourceDate(e.target.value)}
              className="ui-input"
              required
            />
          </div>

          {copyError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{copyError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(false)}
              className="ui-button-secondary px-5"
              disabled={copyLoading}
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="ui-button-primary bg-warm-600 hover:bg-warm-700 px-5 flex items-center gap-2"
              disabled={copyLoading}
            >
              {copyLoading ? (
                <>
                  <RotateCcw size={16} className="animate-spin" />
                  Копіювання...
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Копіювати
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isManualRestockModalOpen}
        onClose={() => setIsManualRestockModalOpen(false)}
        title="Ручне поповнення залишків без накладної"
        maxWidth="4xl"
      >
        <form onSubmit={handleManualRestockSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Причина руху на складі</label>
            <input
              value={manualRestockReason}
              onChange={(event) => setManualRestockReason(event.target.value)}
              placeholder="Наприклад: ручне поповнення для підтвердження меню"
              className="ui-input"
            />
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 px-1 text-[11px] font-black uppercase tracking-wider text-gray-400 md:grid-cols-[1.8fr_0.7fr_0.8fr_0.9fr]">
              <div>Продукт</div>
              <div>Од. виміру</div>
              <div>Кількість</div>
              <div>Ціна за од.</div>
            </div>
            {restockItems.map((item, index) => (
              <div key={`manual-${item.productId}-${index}`} className="grid gap-3 rounded-2xl border border-warm-100 bg-warm-50/50 p-4 md:grid-cols-[1.8fr_0.7fr_0.8fr_0.9fr]">
                <div>
                  <div className="font-bold text-gray-800">{item.productName}</div>
                  <div className="text-xs text-gray-500">Поповнення без накладної, але з фіксацією ціни та історії руху продукту.</div>
                </div>
                <input
                  value={item.unit}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row))}
                  placeholder="Од."
                  className="ui-input"
                />
                <input
                  value={item.quantity}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))}
                  placeholder="Кількість"
                  className="ui-input"
                />
                <input
                  value={item.unitPrice}
                  onChange={(event) => setRestockItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: event.target.value } : row))}
                  placeholder="Ціна"
                  className="ui-input"
                />
              </div>
            ))}
          </div>

          <button type="submit" className="ui-button-primary w-full py-3">
            Поповнити вручну
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(printPreview) || isPreparingPrint}
        onClose={() => {
          setPrintPreview(null);
          setIsPreparingPrint(false);
        }}
        title={printPreview?.type === 'kitchen' ? 'Розкладка кухні' : printPreview?.type === 'requirement' ? 'Меню-вимога' : 'Звітне меню'}
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {isPreparingPrint
                ? 'Готуємо форму до друку...'
                : 'Форма відкривається прямо в додатку. Можна перевірити її та надрукувати без окремого вікна.'}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrintPreview(null);
                  setIsPreparingPrint(false);
                }}
                className="ui-button-secondary px-4"
              >
                Закрити
              </button>
              <button
                type="button"
                disabled={!printPreview || isPreparingPrint}
                onClick={handlePrintFromPreview}
                className="ui-button-primary px-4"
              >
                Друкувати
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-warm-100 bg-warm-50/40 p-3">
            {isPreparingPrint ? (
              <div className="flex min-h-[65vh] items-center justify-center text-center text-lg font-semibold text-gray-500">
                Готуємо форму до друку...
              </div>
            ) : (
              <iframe
                ref={printFrameRef}
                title="Попередній перегляд друку меню"
                className="h-[75vh] w-full rounded-2xl bg-white"
              />
            )}
          </div>
        </div>
      </Modal>

      {activeTab === 'dailyMenu' ? (
        <div className="grid gap-6 2xl:grid-cols-[1.35fr_420px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-warm-100 bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="text-warm-500" />
                  <h3 className="text-xl font-bold text-gray-800">Розклад на тиждень</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIncludeWeekends((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl border border-warm-200 px-3 py-2 text-xs font-bold text-warm-700 hover:bg-warm-50"
                  >
                    <Plus size={14} /> {includeWeekends ? 'Прибрати вихідні' : 'Додати Сб/Нд'}
                  </button>
                  <button onClick={() => setCurrentWeekStart((day) => addDays(day, -7))} className="rounded-xl p-2 transition hover:bg-warm-50"><ChevronLeft /></button>
                  <button onClick={() => setCurrentWeekStart((day) => addDays(day, 7))} className="rounded-xl p-2 transition hover:bg-warm-50"><ChevronRight /></button>
                </div>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const dayMenu = weekMenus.find((menu) => isSameDay(new Date(menu.date), day));
                  const statusMeta = getDayStatusMeta(dayMenu?.status || 'empty');

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${isSelected ? 'border-warm-500 shadow-md' : statusMeta.card} ${!isSelected ? 'hover:border-warm-300' : 'bg-warm-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-gray-400">{format(day, 'EEEEEE', { locale: uk })}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`} />
                      </div>
                      <div className="mt-2 text-2xl font-black text-gray-800">{format(day, 'dd')}</div>
                      <div className={`mt-3 rounded-full border px-2 py-1 text-[9px] font-black uppercase leading-tight tracking-wider ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </div>
                      {dayMenu && dayMenu.itemsCount > 0 && (
                        <div className="mt-2 text-[11px] font-semibold text-gray-500">
                          Страв: {dayMenu.itemsCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-warm-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-warm-500 p-3 text-white shadow-lg shadow-warm-200">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-800">{format(selectedDate, 'dd MMMM', { locale: uk })}</h4>
                    <p className="text-sm font-medium text-gray-500">
                      Зберігаємо день як окремий документ з розкладкою, статусом та друком.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handlePrint('parents')} className="ui-button-secondary border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50">
                    <BookOpen size={16} /> Звітне меню
                  </button>
                  <button onClick={() => handlePrint('kitchen')} className="ui-button-secondary border-orange-200 px-4 text-orange-700 hover:bg-orange-50">
                    <Utensils size={16} /> Розкладка кухні
                  </button>
                  <button onClick={() => handlePrint('requirement')} className="ui-button-secondary border-purple-200 px-4 text-purple-700 hover:bg-purple-50">
                    <FileText size={16} /> Меню-вимога
                  </button>
                  {!menuForm.isConfirmed && (
                    <button
                      onClick={() => {
                        setCopyError(null);
                        setIsCopyModalOpen(true);
                      }}
                      className="ui-button-secondary border-warm-200 px-4 text-warm-700 hover:bg-warm-50"
                    >
                      <Copy size={16} /> Копіювати з іншої дати
                    </button>
                  )}
                  <button
                    disabled={saving || menuForm.isConfirmed}
                    onClick={handleSaveMenu}
                    className="ui-button-secondary px-6"
                  >
                    <Save size={18} /> Зберегти
                  </button>
                  <button
                    disabled={saving || isPreviewing || menuForm.isConfirmed || menuItemRows.filter((row) => row.recipeId).length === 0 || !hasUnsavedMenuChanges}
                    onClick={() => {
                      void handlePreviewMenu();
                    }}
                    className="ui-button-secondary border-sky-200 px-6 text-sky-700 hover:bg-sky-50"
                  >
                    <AlertCircle size={18} /> Перерахувати детально
                  </button>
                  <button
                    disabled={saving || menuForm.isConfirmed || menuItemRows.filter((row) => row.recipeId).length === 0}
                    onClick={handleConfirmMenu}
                    className="ui-button-primary bg-emerald-600 px-6 hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={18} /> {menuForm.isConfirmed ? 'Підтв.' : 'Підтвердити'}
                  </button>
                  {menuForm.isConfirmed && (
                    <button
                      disabled={saving}
                      onClick={handleCancelConfirmation}
                      className="ui-button-secondary border-red-200 px-4 text-red-700 hover:bg-red-50"
                    >
                      <RotateCcw size={16} /> Скасувати підтвердження
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Дітей 0-4 р.</label>
                  <input
                    type="number"
                    value={menuForm.childrenCount0_4}
                    disabled={menuForm.isConfirmed}
                    onChange={(event) => updateMenuField('childrenCount0_4', event.target.value)}
                    className="ui-input text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Дітей 5-7 р.</label>
                  <input
                    type="number"
                    value={menuForm.childrenCount5_7}
                    disabled={menuForm.isConfirmed}
                    onChange={(event) => updateMenuField('childrenCount5_7', event.target.value)}
                    className="ui-input text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Співробітники</label>
                  <input
                    type="number"
                    value={menuForm.employeesCount}
                    disabled={menuForm.isConfirmed}
                    onChange={(event) => updateMenuField('employeesCount', event.target.value)}
                    className="ui-input text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Ціль на 1 дит. (0-4)</label>
                  <input
                    type="number"
                    value={menuForm.targetPrice0_4}
                    disabled={menuForm.isConfirmed}
                    onChange={(event) => updateMenuField('targetPrice0_4', event.target.value)}
                    className="ui-input text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Ціль на 1 дит. (5-7)</label>
                  <input
                    type="number"
                    value={menuForm.targetPrice5_7}
                    disabled={menuForm.isConfirmed}
                    onChange={(event) => updateMenuField('targetPrice5_7', event.target.value)}
                    className="ui-input text-lg font-bold"
                  />
                </div>
              </div>

              {hasUnsavedMenuChanges && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Є незбережені зміни. Детальна картка дня і друк працюють від останньої збереженої версії меню.
                </div>
              )}

              {isPreviewing && (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  Виконується точний автоматичний перерахунок меню...
                </div>
              )}

              <div className="mt-8 space-y-6">
                {mealTypes.map((type) => (
                  <div key={type.id} className="space-y-4">
                    <div className="flex items-center gap-2 border-l-4 border-warm-500 pl-3">
                      <span className="text-warm-500">{type.icon}</span>
                      <h5 className="text-sm font-black uppercase tracking-wider text-gray-700">{type.name}</h5>
                      <button
                        disabled={menuForm.isConfirmed}
                        onClick={() => {
                          setHasUnsavedMenuChanges(true);
                          setMenuItemRows((prev) => [...prev, emptyMenuItemRow(type.id)]);
                        }}
                        className="ml-auto flex items-center gap-1 text-xs font-bold text-warm-500 hover:text-warm-600"
                      >
                        <Plus size={14} /> Додати страву
                      </button>
                    </div>

                    <div className="space-y-3">
                      {menuItemRows.filter((row) => row.mealType === type.id).map((row) => {
                        const realIdx = menuItemRows.indexOf(row);
                        const recipe = recipes.find((item) => item.id === Number(row.recipeId));
                        const hasAdjustments = (row.adjustments || []).some((adjustment) => adjustment.isAdjusted);

                        return (
                          <div key={`${type.id}-${realIdx}`} className="rounded-2xl border border-warm-100 bg-warm-50/50 p-4">
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="min-w-[240px] flex-1">
                                <CustomSelect
                                  options={recipes.map((recipeOption) => ({ id: recipeOption.id, name: recipeOption.name }))}
                                  value={row.recipeId}
                                  onChange={(value) => {
                                    const nextRecipe = recipes.find((item) => item.id === Number(value));
                                    updateMenuItemRow(realIdx, (currentRow) => ({
                                      ...currentRow,
                                      recipeId: String(value),
                                      outputWeight0_4: currentRow.outputWeight0_4 || String(nextRecipe?.outputWeight || ''),
                                      outputWeight5_7: currentRow.outputWeight5_7 || String(nextRecipe?.outputWeight || ''),
                                      outputWeightEmployees: currentRow.outputWeightEmployees || String(nextRecipe?.outputWeight || ''),
                                      adjustments: [],
                                      adjustmentsExpanded: false,
                                    }));
                                  }}
                                  placeholder="Оберіть страву"
                                />
                              </div>
                              <div className="w-36 space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                  Вихід 0-4, г
                                </label>
                                <input
                                  placeholder="Вихід 0-4"
                                  value={row.outputWeight0_4}
                                  disabled={menuForm.isConfirmed}
                                  onChange={(event) => updateMenuItemRow(realIdx, (currentRow) => ({
                                    ...currentRow,
                                    outputWeight0_4: event.target.value,
                                  }))}
                                  className="ui-input text-center text-xs"
                                />
                              </div>
                              <div className="w-36 space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                  Вихід 5-7, г
                                </label>
                                <input
                                  placeholder="Вихід 5-7"
                                  value={row.outputWeight5_7}
                                  disabled={menuForm.isConfirmed}
                                  onChange={(event) => updateMenuItemRow(realIdx, (currentRow) => ({
                                    ...currentRow,
                                    outputWeight5_7: event.target.value,
                                  }))}
                                  className="ui-input text-center text-xs"
                                />
                              </div>
                              <div className="w-40 space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                                  Вихід співр., г
                                </label>
                                <input
                                  placeholder="Вихід співр."
                                  value={row.outputWeightEmployees}
                                  disabled={menuForm.isConfirmed}
                                  onChange={(event) => updateMenuItemRow(realIdx, (currentRow) => ({
                                    ...currentRow,
                                    outputWeightEmployees: event.target.value,
                                  }))}
                                  className="ui-input text-center text-xs"
                                />
                              </div>
                              <div className="w-48 pt-2 text-right">
                                <div className="text-[11px] font-black text-gray-800 leading-tight">
                                  {recipe ? `${formatMoney(getScaledRecipeCost(recipe, row, '0-4'))} / ${formatMoney(getScaledRecipeCost(recipe, row, '5-7'))} / ${formatMoney(getScaledRecipeCost(recipe, row, 'employees'))}` : '—'}
                                </div>
                                <div className="text-[9px] font-bold uppercase text-gray-400 mt-1">ціна 0-4 / 5-7 / співр.</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={menuForm.isConfirmed || !row.recipeId}
                                  onClick={async () => {
                                    await ensureMenuItemAdjustments(realIdx);
                                    setMenuItemRows((prev) => prev.map((item, itemIndex) => (
                                      itemIndex === realIdx
                                        ? { ...item, adjustmentsExpanded: !item.adjustmentsExpanded }
                                        : item
                                    )));
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${hasAdjustments ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}
                                >
                                  <Settings2 size={14} /> {hasAdjustments ? 'Коригування дня' : 'Склад на сьогодні'}
                                </button>
                                <button
                                  disabled={menuForm.isConfirmed}
                                  onClick={() => {
                                    setHasUnsavedMenuChanges(true);
                                    setMenuItemRows((prev) => prev.filter((_, index) => index !== realIdx));
                                  }}
                                  className="rounded-xl p-2.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {row.adjustmentsExpanded && (
                              <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div>
                                    <h6 className="font-bold text-gray-800">Тимчасова корекція складу на цей день</h6>
                                    <p className="text-xs text-gray-500">
                                      Базовий рецепт не змінюється. Корекція збережеться тільки для цього меню.
                                    </p>
                                    <p className="mt-1 text-xs text-sky-700">
                                      Тут ви змінюєте кількість конкретного інгредієнта в складі страви на сьогодні.
                                    </p>
                                  </div>
                                  {hasAdjustments && (
                                    <button
                                      onClick={() => updateMenuItemRow(realIdx, (currentRow) => ({
                                        ...currentRow,
                                        adjustments: (currentRow.adjustments || []).map((adjustment) => ({
                                          ...adjustment,
                                          weight: String(adjustment.defaultWeight),
                                          isAdjusted: false,
                                        })),
                                      }))}
                                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                                    >
                                      <RotateCcw size={14} /> Скинути коригування
                                    </button>
                                  )}
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                                        <th className="py-2 pr-3">Інгредієнт</th>
                                        <th className="py-2 pr-3">Група</th>
                                        <th className="py-2 pr-3 text-right">Кількість базова</th>
                                        <th className="py-2 pr-3 text-right">Кількість на сьогодні</th>
                                        <th className="py-2 pr-3 text-right">Дії</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(row.adjustments || []).map((adjustment, adjustmentIndex) => {
                                        const isDeleted = Number(adjustment.weight) === 0;
                                        return (
                                          <tr key={`${adjustment.recipeIngredientId || 'new'}-${adjustmentIndex}`} className={`border-b border-gray-50 transition-all ${isDeleted ? 'opacity-40 bg-gray-50/50' : ''}`}>
                                            <td className="py-3 pr-3">
                                              <div className="font-semibold text-gray-800">{adjustment.sourceName}</div>
                                              <div className="text-[11px] text-gray-400">
                                                {adjustment.sourceType === 'product' ? `Продукт, ${formatIngredientUnit(adjustment.unit)}` : 'Підрецепт'}
                                              </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                              <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold uppercase text-gray-500">
                                                {adjustment.ageGroup === 'common' ? 'загальна' : adjustment.ageGroup}
                                              </span>
                                            </td>
                                            <td className="py-3 pr-3 text-right font-semibold text-gray-600">{adjustment.defaultWeight} {formatIngredientUnit(adjustment.unit)}</td>
                                            <td className="py-3 pr-3">
                                              <input
                                                value={adjustment.weight}
                                                disabled={menuForm.isConfirmed || isDeleted}
                                                onChange={(event) => updateMenuItemRow(realIdx, (currentRow) => ({
                                                  ...currentRow,
                                                  adjustments: (currentRow.adjustments || []).map((rowAdjustment, rowAdjustmentIndex) => (
                                                    rowAdjustmentIndex === adjustmentIndex
                                                      ? {
                                                        ...rowAdjustment,
                                                        weight: event.target.value,
                                                        isAdjusted: Number(event.target.value) !== rowAdjustment.defaultWeight,
                                                      }
                                                      : rowAdjustment
                                                  )),
                                                }))}
                                                className="ui-input h-10 text-right text-sm"
                                              />
                                            </td>
                                            <td className="py-3 pr-3 text-right">
                                              {isDeleted ? (
                                                <button
                                                  type="button"
                                                  disabled={menuForm.isConfirmed}
                                                  onClick={() => {
                                                    updateMenuItemRow(realIdx, (currentRow) => ({
                                                      ...currentRow,
                                                      adjustments: (currentRow.adjustments || []).map((rowAdjustment, rowAdjustmentIndex) => (
                                                        rowAdjustmentIndex === adjustmentIndex
                                                          ? {
                                                            ...rowAdjustment,
                                                            weight: String(rowAdjustment.defaultWeight),
                                                            isAdjusted: false,
                                                          }
                                                          : rowAdjustment
                                                      )),
                                                    }));
                                                  }}
                                                  className="rounded-lg p-1.5 text-sky-500 hover:bg-sky-50 transition"
                                                  title="Відновити інгредієнт"
                                                >
                                                  <RotateCcw size={14} />
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  disabled={menuForm.isConfirmed}
                                                  onClick={() => {
                                                    if (adjustment.recipeIngredientId !== null) {
                                                      updateMenuItemRow(realIdx, (currentRow) => ({
                                                        ...currentRow,
                                                        adjustments: (currentRow.adjustments || []).map((rowAdjustment, rowAdjustmentIndex) => (
                                                          rowAdjustmentIndex === adjustmentIndex
                                                            ? {
                                                              ...rowAdjustment,
                                                              weight: '0',
                                                              isAdjusted: true,
                                                            }
                                                            : rowAdjustment
                                                        )),
                                                      }));
                                                    } else {
                                                      updateMenuItemRow(realIdx, (currentRow) => ({
                                                        ...currentRow,
                                                        adjustments: (currentRow.adjustments || []).filter((_, rowAdjustmentIndex) => rowAdjustmentIndex !== adjustmentIndex),
                                                      }));
                                                    }
                                                    setHasUnsavedMenuChanges(true);
                                                  }}
                                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                                                  title="Видалити інгредієнт"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}

                                      {addingIngredientToRowIdx === realIdx && (
                                        <tr className="bg-sky-50/50">
                                          <td className="py-2 pr-3">
                                            <select
                                              value={newIngredientForm.productId}
                                              onChange={(e) => setNewIngredientForm(prev => ({ ...prev, productId: e.target.value }))}
                                              className="ui-input h-10 w-full text-xs"
                                            >
                                              <option value="">-- Оберіть продукт --</option>
                                              {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="py-2 pr-3">
                                            <select
                                              value={newIngredientForm.ageGroup}
                                              onChange={(e) => setNewIngredientForm(prev => ({ ...prev, ageGroup: e.target.value }))}
                                              className="ui-input h-10 w-full text-xs"
                                            >
                                              <option value="common">загальна</option>
                                              <option value="0-4">0-4</option>
                                              <option value="5-7">5-7</option>
                                            </select>
                                          </td>
                                          <td className="py-2 pr-3 text-right text-xs text-gray-500 font-bold">—</td>
                                          <td className="py-2 pr-3">
                                            <div className="flex items-center gap-1.5 justify-end">
                                              <input
                                                type="text"
                                                placeholder="вага"
                                                value={newIngredientForm.weight}
                                                onChange={(e) => setNewIngredientForm(prev => ({ ...prev, weight: e.target.value.replace(/\D/g, '') }))}
                                                className="ui-input h-10 w-20 text-right text-xs"
                                              />
                                              <span className="text-[10px] text-gray-500 font-semibold">{newIngredientForm.productId ? formatIngredientUnit(products.find(p => p.id === Number(newIngredientForm.productId))?.unit || 'кг') : 'г'}</span>
                                            </div>
                                          </td>
                                          <td className="py-2 pr-3 text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const prodId = Number(newIngredientForm.productId);
                                                  const weightVal = Number(newIngredientForm.weight);
                                                  if (!prodId || !weightVal) return;

                                                  const selectedProduct = products.find(p => p.id === prodId);
                                                  if (!selectedProduct) return;

                                                  const newAdjustment: MenuIngredientAdjustmentRow = {
                                                    recipeIngredientId: null,
                                                    productId: prodId,
                                                    subRecipeId: null,
                                                    sourceType: 'product',
                                                    sourceName: selectedProduct.name,
                                                    ageGroup: newIngredientForm.ageGroup,
                                                    unit: selectedProduct.unit,
                                                    defaultWeight: 0,
                                                    weight: String(weightVal),
                                                    isAdjusted: true,
                                                  };

                                                  updateMenuItemRow(realIdx, (currentRow) => ({
                                                    ...currentRow,
                                                    adjustments: [...(currentRow.adjustments || []), newAdjustment],
                                                  }));

                                                  setAddingIngredientToRowIdx(null);
                                                  setNewIngredientForm({ productId: '', ageGroup: 'common', weight: '' });
                                                  setHasUnsavedMenuChanges(true);
                                                }}
                                                className="rounded-lg bg-sky-500 px-2 py-1 text-xs font-bold text-white hover:bg-sky-600 transition"
                                              >
                                                ОК
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setAddingIngredientToRowIdx(null);
                                                  setNewIngredientForm({ productId: '', ageGroup: 'common', weight: '' });
                                                }}
                                                className="rounded-lg border border-gray-200 px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 transition"
                                              >
                                                Х
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                {addingIngredientToRowIdx !== realIdx && !menuForm.isConfirmed && (
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingIngredientToRowIdx(realIdx);
                                        setNewIngredientForm({ productId: '', ageGroup: 'common', weight: '' });
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                                    >
                                      <Plus size={14} /> Додати інгредієнт на сьогодні
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {effectiveMenuAnalysis && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Документ дня</p>
                      <h3 className="text-2xl font-bold text-gray-800">Сформоване меню на {format(new Date(effectiveMenuAnalysis.date), 'dd MMMM', { locale: uk })}</h3>
                    </div>
                    <div className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wider ${getDayStatusMeta(effectiveMenuAnalysis.status).badge}`}>
                      {getDayStatusMeta(effectiveMenuAnalysis.status).label}
                    </div>
                  </div>

                  {menuCostAlerts.dayAlerts.length > 0 && (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-black uppercase tracking-widest text-amber-700">Контроль вартості</div>
                      <div className="mt-3 space-y-2">
                        {menuCostAlerts.dayAlerts.map((alert, index) => (
                          <div key={`day-alert-${index}`} className="text-sm font-semibold text-amber-900">
                            {alert}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="rounded-2xl bg-warm-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-warm-500">Страв у меню</div>
                      <div className="mt-2 text-3xl font-black text-gray-800">{effectiveMenuAnalysis.itemsCount}</div>
                    </div>
                    <div className="rounded-2xl bg-sky-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-sky-500">Дітей / Співр.</div>
                      <div className="mt-2 text-3xl font-black text-gray-800">
                        {analysisTotals.totalChildren} / {analysisTotals.totalEmployees}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-emerald-600">Собівартість 0-4</div>
                      <div className="mt-2 text-xl font-black text-gray-800">{formatMoney(analysisTotals.costPerChild0_4)}</div>
                    </div>
                    <div className="rounded-2xl bg-violet-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-violet-600">Собівартість 5-7</div>
                      <div className="mt-2 text-xl font-black text-gray-800">{formatMoney(analysisTotals.costPerChild5_7)}</div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-amber-600">Собівартість співр.</div>
                      <div className="mt-2 text-xl font-black text-gray-800">{formatMoney(analysisTotals.costPerEmployee)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Страви дня</p>
                    <h4 className="text-xl font-bold text-gray-800">Картка сформованого меню</h4>
                  </div>

                  <div className="space-y-5">
                    {mealTypes.map((type) => {
                      const items = effectiveMenuItems.filter((item) => item.mealType === type.id);
                      if (items.length === 0) {
                        return null;
                      }

                      return (
                        <div key={`analysis-${type.id}`} className="space-y-3">
                          <div className="flex items-center gap-2 border-l-4 border-warm-500 pl-3">
                            <span className="text-warm-500">{type.icon}</span>
                            <h5 className="text-sm font-black uppercase tracking-wider text-gray-700">{type.name}</h5>
                          </div>

                          {items.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-warm-100 bg-warm-50/40 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className="text-lg font-bold text-gray-800">{item.recipeName}</div>
                                  <div className="mt-1 text-sm text-gray-500">
                                    Вихід: {item.outputWeight0_4 || item.defaultOutputWeight} г для 0-4 /
                                    {' '}
                                    {item.outputWeight5_7 || item.defaultOutputWeight} г для 5-7 /
                                    {' '}
                                    {item.outputWeightEmployees || item.defaultOutputWeight} г для співр.
                                  </div>
                                  {item.hasAdjustments && (
                                    <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                                      Є денні коригування: {item.adjustmentsCount}
                                    </div>
                                  )}
                                </div>
                                <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
                                  <div className="rounded-2xl bg-white p-3 text-right">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Сума 0-4 група</div>
                                    <div className="text-lg font-black text-gray-800">{formatMoney(item.cost0_4)}</div>
                                    <div className="mt-1 text-[11px] font-semibold text-gray-500">
                                      За 1 дитину:{' '}
                                      {formatMoney(
                                        Number(menuForm.childrenCount0_4) > 0
                                          ? item.cost0_4 / Number(menuForm.childrenCount0_4)
                                          : 0
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl bg-white p-3 text-right">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Сума 5-7 група</div>
                                    <div className="text-lg font-black text-gray-800">{formatMoney(item.cost5_7)}</div>
                                    <div className="mt-1 text-[11px] font-semibold text-gray-500">
                                      За 1 дитину:{' '}
                                      {formatMoney(
                                        Number(menuForm.childrenCount5_7) > 0
                                          ? item.cost5_7 / Number(menuForm.childrenCount5_7)
                                          : 0
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-warm-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                                      <th className="py-2 pr-3">Продукт</th>
                                      <th className="py-2 pr-3 text-center">Од.</th>
                                      <th className="py-2 pr-3 text-right">Кількість 0-4</th>
                                      <th className="py-2 pr-3 text-right">Кількість 5-7</th>
                                      <th className="py-2 pr-3 text-right">Кількість співр.</th>
                                      <th className="py-2 pr-3 text-right">Разом</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(item.productBreakdown || []).map((product) => (
                                      <tr key={`${item.id}-${product.productId}`} className="border-b border-warm-50">
                                        <td className="py-3 pr-3 font-semibold text-gray-800">{product.productName}</td>
                                        <td className="py-3 pr-3 text-center text-gray-500">{product.unit}</td>
                                        <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantity0_4)} {product.unit}</td>
                                        <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantity5_7)} {product.unit}</td>
                                        <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantityEmployees)} {product.unit}</td>
                                        <td className="py-3 pr-3 text-right font-black text-gray-800">{formatQty(product.totalGrossQuantity)} {product.unit}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {menuCostAlerts.expensiveItems.some((alertItem) => alertItem.id === item.id) && (
                                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-3">
                                  <div className="text-[11px] font-black uppercase tracking-widest text-red-700">Цінова аномалія</div>
                                  {menuCostAlerts.expensiveItems
                                    .filter((alertItem) => alertItem.id === item.id)
                                    .map((alertItem) => (
                                      <div key={`expensive-item-${alertItem.id}`} className="mt-2 space-y-1 text-xs text-red-900">
                                        {alertItem.share0_4 >= 0.35 && (
                                          <div>
                                            Для групи 0-4 ця страва дає {Math.round(alertItem.share0_4 * 100)}% вартості дня,
                                            приблизно {formatMoney(alertItem.cost0_4PerChild)} на 1 дитину.
                                          </div>
                                        )}
                                        {alertItem.share5_7 >= 0.35 && (
                                          <div>
                                            Для групи 5-7 ця страва дає {Math.round(alertItem.share5_7 * 100)}% вартості дня,
                                            приблизно {formatMoney(alertItem.cost5_7PerChild)} на 1 дитину.
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Зведення</p>
                    <h4 className="text-xl font-bold text-gray-800">Скільки продуктів витрачено за день</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-warm-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                          <th className="py-2 pr-3">Продукт</th>
                          <th className="py-2 pr-3 text-center">Од.</th>
                          <th className="py-2 pr-3 text-right">Кількість 0-4</th>
                          <th className="py-2 pr-3 text-right">Кількість 5-7</th>
                          <th className="py-2 pr-3 text-right">Кількість співр.</th>
                          <th className="py-2 pr-3 text-right">Разом</th>
                          <th className="py-2 pr-3 text-right">Сума</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveSummaryNeeds.map((product) => (
                          <tr key={product.productId} className="border-b border-warm-50">
                            <td className="py-3 pr-3 font-semibold text-gray-800">{product.productName}</td>
                            <td className="py-3 pr-3 text-center text-gray-500">{product.unit}</td>
                            <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantity0_4)} {product.unit}</td>
                            <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantity5_7)} {product.unit}</td>
                            <td className="py-3 pr-3 text-right">{formatQty(product.grossQuantityEmployees)} {product.unit}</td>
                            <td className="py-3 pr-3 text-right font-black text-gray-800">{formatQty(product.totalGrossQuantity)} {product.unit}</td>
                            <td className="py-3 pr-3 text-right font-semibold text-gray-700">{formatMoney(product.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-gray-400">Фінансовий підсумок</h4>

                {lastExactCalculationAt && (
                  <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs font-semibold text-sky-800">
                    Останній точний перерахунок: {formatCalculationTime(lastExactCalculationAt)}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="mb-2 flex justify-between text-xs font-bold uppercase text-gray-500">Група 0-4 роки</div>
                    <div className={`text-2xl font-black ${displayedTotals.cost0_4 > Number(menuForm.targetPrice0_4) ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatMoney(displayedTotals.cost0_4)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">За 1 дитину 0-4 років на день</div>
                    <div className="mt-4 grid gap-3 rounded-2xl bg-white/80 p-3">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Кількість дітей 0-4</span>
                        <span>{Number(menuForm.childrenCount0_4)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Сума по групі 0-4</span>
                        <span>{formatMoney(analysisTotals.totalCost0_4)}</span>
                      </div>
                      <div className="border-t border-emerald-100 pt-2 text-[10px] text-gray-500">
                        Формула: {formatMoney(displayedTotals.cost0_4)} × {Number(menuForm.childrenCount0_4)} = {formatMoney(analysisTotals.totalCost0_4)}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">ЦІЛЬ НА 1 ДИТИНУ: {formatMoney(Number(menuForm.targetPrice0_4))}</div>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                    <div className="mb-2 flex justify-between text-xs font-bold uppercase text-gray-500">Група 5-7 років</div>
                    <div className={`text-2xl font-black ${displayedTotals.cost5_7 > Number(menuForm.targetPrice5_7) ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatMoney(displayedTotals.cost5_7)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">За 1 дитину 5-7 років на день</div>
                    <div className="mt-4 grid gap-3 rounded-2xl bg-white/80 p-3">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Кількість дітей 5-7</span>
                        <span>{Number(menuForm.childrenCount5_7)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Сума по групі 5-7</span>
                        <span>{formatMoney(analysisTotals.totalCost5_7)}</span>
                      </div>
                      <div className="border-t border-violet-100 pt-2 text-[10px] text-gray-500">
                        Формула: {formatMoney(displayedTotals.cost5_7)} × {Number(menuForm.childrenCount5_7)} = {formatMoney(analysisTotals.totalCost5_7)}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">ЦІЛЬ НА 1 ДИТИНУ: {formatMoney(Number(menuForm.targetPrice5_7))}</div>
                  </div>

                  <div className="space-y-3 rounded-2xl bg-warm-50 p-4">
                    <div className="flex justify-between text-xs font-bold text-gray-600">
                      <span>ВСЬОГО ДІТЕЙ</span>
                      <span>{Number(menuForm.childrenCount0_4) + Number(menuForm.childrenCount5_7)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-600">
                      <span>ЗАГАЛЬНА СУМА</span>
                      <span>{formatMoney(analysisTotals.totalCostAll)}</span>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3 text-[10px] text-gray-500">
                      <div className="font-bold uppercase tracking-wide text-gray-400 mb-2">Контрольна перевірка</div>
                      <div>
                        {formatMoney(analysisTotals.totalCost0_4)} + {formatMoney(analysisTotals.totalCost5_7)} = {formatMoney(analysisTotals.totalCostAll)}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Підсумок складається з вартості за 1 дитину у кожній віковій групі, помноженої на кількість дітей у відповідній групі, після чого суми двох груп додаються.
                    </div>
                    {(suspiciousCostFlags.suspiciousDishes.length > 0 || suspiciousCostFlags.suspiciousProducts.length > 0) && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-700">Підозріло дорого</div>
                        <div className="mt-2 space-y-1 text-xs text-red-900">
                          {suspiciousCostFlags.suspiciousDishes.map((item) => (
                            <div key={item.key}>
                              {item.label}: {Math.round(item.share * 100)}% вартості дня, {formatMoney(item.value)}.
                            </div>
                          ))}
                          {suspiciousCostFlags.suspiciousProducts.map((item) => (
                            <div key={item.key}>
                              {item.label}: {Math.round(item.share * 100)}% вартості дня, {formatMoney(item.value)}.
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {effectiveMenuAnalysis && (
                <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Розшифровка суми</h4>
                    <p className="mt-2 text-sm text-gray-500">
                      Найдорожчі страви та продукти дня, які формують підсумкову собівартість.
                    </p>
                  </div>

                  {hasUnsavedMenuChanges && !previewAnalysis && (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Для точного складу страв і продуктів натисніть `Перерахувати детально`. Поки що нижче показана остання збережена версія меню.
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-700">Топ страв 0-4</div>
                      <div className="space-y-2">
                        {menuCostBreakdown.topDish0_4.length > 0 ? (
                          menuCostBreakdown.topDish0_4.map((item) => (
                            <div key={`dish-0-4-${item.id}`} className="rounded-2xl bg-white/80 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-gray-800">{item.name}</div>
                                  {item.share >= SUSPICIOUS_COST_SHARE && (
                                    <div className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                                      Підозріло дорого
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm font-black text-gray-900">{formatMoney(item.value)}</div>
                              </div>
                              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                                Частка дня: {Math.round(item.share * 100)}%
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Немає даних для розрахунку.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                      <div className="mb-3 text-xs font-black uppercase tracking-widest text-violet-700">Топ страв 5-7</div>
                      <div className="space-y-2">
                        {menuCostBreakdown.topDish5_7.length > 0 ? (
                          menuCostBreakdown.topDish5_7.map((item) => (
                            <div key={`dish-5-7-${item.id}`} className="rounded-2xl bg-white/80 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-gray-800">{item.name}</div>
                                  {item.share >= SUSPICIOUS_COST_SHARE && (
                                    <div className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                                      Підозріло дорого
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm font-black text-gray-900">{formatMoney(item.value)}</div>
                              </div>
                              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                                Частка дня: {Math.round(item.share * 100)}%
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Немає даних для розрахунку.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-warm-50 p-4">
                      <div className="mb-3 text-xs font-black uppercase tracking-widest text-warm-600">Топ продуктів 0-4</div>
                      <div className="space-y-2">
                        {menuCostBreakdown.topProduct0_4.length > 0 ? (
                          menuCostBreakdown.topProduct0_4.map((product) => (
                            <div key={`product-0-4-${product.id}`} className="rounded-2xl bg-white/80 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-gray-800">{product.name}</div>
                                  {product.share >= SUSPICIOUS_COST_SHARE && (
                                    <div className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                                      Підозріло дорого
                                    </div>
                                  )}
                                  <div className="text-[10px] uppercase tracking-wide text-gray-400">{product.unit}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-gray-900">{formatMoney(product.value)}</div>
                                  <div className="text-[10px] uppercase tracking-wide text-gray-500">{Math.round(product.share * 100)}% дня</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Немає даних для розрахунку.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-warm-50 p-4">
                      <div className="mb-3 text-xs font-black uppercase tracking-widest text-warm-600">Топ продуктів 5-7</div>
                      <div className="space-y-2">
                        {menuCostBreakdown.topProduct5_7.length > 0 ? (
                          menuCostBreakdown.topProduct5_7.map((product) => (
                            <div key={`product-5-7-${product.id}`} className="rounded-2xl bg-white/80 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-gray-800">{product.name}</div>
                                  {product.share >= SUSPICIOUS_COST_SHARE && (
                                    <div className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                                      Підозріло дорого
                                    </div>
                                  )}
                                  <div className="text-[10px] uppercase tracking-wide text-gray-400">{product.unit}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-gray-900">{formatMoney(product.value)}</div>
                                  <div className="text-[10px] uppercase tracking-wide text-gray-500">{Math.round(product.share * 100)}% дня</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Немає даних для розрахунку.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
                <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-gray-400">Що це дає</h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>День із меню підсвічується окремим статусом у розкладі тижня.</p>
                  <p>Картка дня показує детальний розхід продуктів по кожній страві.</p>
                  <p>Коригування працює тільки для поточної дати і не змінює базовий рецепт.</p>
                  <p>Друк формує звітне меню і окрему розкладку для кухні та звітності.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[1fr_450px]">
          <div className={`rounded-3xl border border-warm-100 bg-white p-5 shadow-sm ${selectedRecipeId ? 'order-2 2xl:order-2' : 'order-2'}`}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">База рецептів</h3>
              <div className="flex gap-2">
                {selectedRecipeId && (
                  <button
                    onClick={() => {
                      setSelectedRecipeId(null);
                      setRecipeForm({
                        name: '',
                        dishType: '',
                        outputWeight: '',
                        techCard: '',
                        isBaseRecipe: false,
                      });
                      setIngredientRows([{ sourceType: 'product', sourceId: '', ageGroup: 'common', weight: '' }]);
                    }}
                    className="ui-button-secondary px-4 py-2 text-sm"
                  >
                    <RotateCcw size={16} /> Скасувати редагування
                  </button>
                )}
                <button onClick={() => setSelectedRecipeId(null)} className="ui-button-secondary px-4 py-2 text-sm"><Plus size={16} /> Новий рецепт</button>
              </div>
            </div>
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
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

          <div ref={recipeEditorRef} className={`h-fit rounded-3xl border border-warm-100 bg-white p-6 shadow-sm ${selectedRecipeId ? 'order-1 2xl:col-span-2' : 'sticky top-6'}`}>
            <h3 className="mb-6 text-xl font-bold text-gray-800">{selectedRecipeId ? 'Редагування рецепта' : 'Створення рецепта'}</h3>
            <form className="space-y-4">
              <input value={recipeForm.name} onChange={(event) => setRecipeForm({ ...recipeForm, name: event.target.value })} placeholder="Назва рецепта" className="ui-input font-bold" />
              <div className="grid grid-cols-2 gap-3">
                <input value={recipeForm.dishType} onChange={(event) => setRecipeForm({ ...recipeForm, dishType: event.target.value })} placeholder="Тип страви" className="ui-input text-sm" />
                <input value={recipeForm.outputWeight} onChange={(event) => setRecipeForm({ ...recipeForm, outputWeight: event.target.value })} placeholder="Вихід, г" className="ui-input text-sm" />
              </div>

              <div className="border-t border-warm-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Інгредієнти</h4>
                  <button type="button" onClick={() => setIngredientRows([...ingredientRows, { sourceType: 'product', sourceId: '', ageGroup: 'common', weight: '' }])} className="text-warm-500 hover:text-warm-600"><Plus size={18} /></button>
                </div>
                <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                  {ingredientRows.map((ingredient, idx) => (
                    <div key={idx} className="space-y-2 rounded-xl border border-warm-100 bg-warm-50/50 p-3">
                      <CustomSelect
                        options={ingredient.sourceType === 'product' ? products : recipes.filter((recipe) => recipe.id !== selectedRecipeId)}
                        value={ingredient.sourceId}
                        onChange={(value) => {
                          const next = [...ingredientRows];
                          next[idx].sourceId = String(value);
                          setIngredientRows(next);
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Кількість / вага" value={ingredient.weight} onChange={(event) => { const next = [...ingredientRows]; next[idx].weight = event.target.value; setIngredientRows(next); }} className="ui-input text-xs" />
                        <CustomSelect
                          options={[
                            { id: 'common', name: 'Загальна' },
                            { id: '0-4', name: '0-4' },
                            { id: '5-7', name: '5-7' },
                          ]}
                          value={ingredient.ageGroup}
                          onChange={(value) => {
                            const next = [...ingredientRows];
                            next[idx].ageGroup = String(value);
                            setIngredientRows(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    const payload = {
                      name: recipeForm.name,
                      dishType: recipeForm.dishType,
                      outputWeight: Number(recipeForm.outputWeight),
                      techCard: recipeForm.techCard,
                      isBaseRecipe: recipeForm.isBaseRecipe,
                      ingredients: ingredientRows.map((row) => ({
                        productId: row.sourceType === 'product' ? Number(row.sourceId) : undefined,
                        subRecipeId: row.sourceType === 'recipe' ? Number(row.sourceId) : undefined,
                        ageGroup: row.ageGroup,
                        grossWeight: Number(row.weight),
                        netWeight: Number(row.weight),
                      })),
                    };

                    if (selectedRecipeId) {
                      await api.put(`/recipes/${selectedRecipeId}`, payload);
                    } else {
                      await api.post('/recipes', payload);
                    }

                    setSuccess('Рецепт збережено');
                    void loadBootstrapData();
                  } catch {
                    setError('Помилка збереження рецепта');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="ui-button-primary mt-4 w-full py-3"
              >
                {selectedRecipeId ? 'Оновити рецепт' : 'Зберегти рецепт'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title || 'Підтвердження дії'}
      >
        {confirmAction && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-4 text-sm ${
              confirmAction.tone === 'red'
                ? 'border-red-100 bg-red-50 text-red-700'
                : 'border-emerald-100 bg-emerald-50 text-emerald-700'
            }`}>
              {confirmAction.message}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
              >
                Закрити
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedAction()}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2 font-bold text-white transition ${
                  confirmAction.tone === 'red'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmAction.type === 'confirmMenu' ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MenuPage;
