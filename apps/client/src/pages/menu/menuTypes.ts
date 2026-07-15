export type Phase4Tab = 'recipes' | 'dailyMenu';

export interface ProductOption {
  id: number;
  name: string;
  unit: string;
  currentPrice: number;
}

export interface SupplierOption {
  id: number;
  name: string;
}

export interface MissingStockItem {
  productId: number;
  productName: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
}

export interface RestockItemForm {
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

export interface RecipeSummary {
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

export interface RecipeDetails {
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
    lines: unknown[];
  };
}

export interface DailyMenuSummary {
  id: number;
  date: string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  targetPrice0_4?: number | null;
  targetPrice5_7?: number | null;
  isConfirmed: boolean;
  stockDeducted: boolean;
  itemsCount: number;
  hasAdjustments: boolean;
  status: 'empty' | 'draft' | 'adjusted' | 'confirmed';
}

export interface MenuIngredientAdjustmentRow {
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

export interface MenuItemRow {
  id?: number;
  recipeId: string;
  mealType: string;
  outputWeight0_4: string;
  outputWeight5_7: string;
  outputWeightEmployees: string;
  adjustments?: MenuIngredientAdjustmentRow[];
  adjustmentsExpanded?: boolean;
}

export interface ProductBreakdown {
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
}

export interface MenuAnalysis {
  id: number;
  date: string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  targetPrice0_4?: number | null;
  targetPrice5_7?: number | null;
  isConfirmed: boolean;
  stockDeducted: boolean;
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
    productBreakdown: ProductBreakdown[];
    cost0_4: number;
    cost5_7: number;
    costEmployees: number;
  }>;
  summaryNeeds?: ProductBreakdown[];
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

export interface ConfirmAction {
  type: 'confirmMenu' | 'cancelConfirmation';
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'emerald' | 'red';
}

export const formatIngredientUnit = (unit: string) => {
  if (unit === 'кг') return 'г';
  if (unit === 'л') return 'мл';
  return unit;
};

export const emptyMenuItemRow = (mealType: string): MenuItemRow => ({
  mealType,
  recipeId: '',
  outputWeight0_4: '',
  outputWeight5_7: '',
  outputWeightEmployees: '',
  adjustments: [],
  adjustmentsExpanded: false,
});

export const SUSPICIOUS_COST_SHARE = 0.4;
