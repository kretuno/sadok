export interface MenuItemIngredientOverrideInput {
  recipeIngredientId: number | null;
  productId?: number | null;
  subRecipeId?: number | null;
  ageGroup?: string | null;
  grossWeight?: number | null;
  netWeight?: number | null;
}

export interface MenuItemInput {
  recipeId: number;
  mealType: string;
  outputWeight0_4?: number | null;
  outputWeight5_7?: number | null;
  outputWeightEmployees?: number | null;
  overrides?: MenuItemIngredientOverrideInput[];
}

export interface DailyMenuInput {
  date: string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  targetPrice0_4?: number | null;
  targetPrice5_7?: number | null;
  items: MenuItemInput[];
}

export interface IngredientDefinition {
  recipeIngredientId: number;
  recipeId: number;
  productId: number | null;
  subRecipeId: number | null;
  ageGroup: string;
  defaultGrossWeight: number;
  defaultNetWeight: number;
  effectiveGrossWeight: number;
  effectiveNetWeight: number;
  productName: string | null;
  productUnit: string | null;
  productPrice: number;
  subRecipeName: string | null;
  subRecipeOutputWeight: number;
  isAdjusted: boolean;
}

export interface ProductContribution {
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

export interface ScaleFactors {
  scale0_4: number;
  scale5_7: number;
  scaleEmployees: number;
}

export interface MenuAnalysisItemSource {
  id: number;
  mealType: string;
  recipeId: number;
  recipeName: string;
  recipeDishType?: string | null;
  defaultOutputWeight: number | null;
  outputWeight0_4?: number | null;
  outputWeight5_7?: number | null;
  outputWeightEmployees?: number | null;
  overrides?: MenuItemIngredientOverrideInput[];
}

export interface MenuStockShortageItem {
  productId: number;
  productName: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
}

export class MenuStockShortageError extends Error {
  shortages: MenuStockShortageItem[];

  constructor(shortages: MenuStockShortageItem[]) {
    const message = shortages
      .map((item) => `${item.productName}: бракує ${item.missingQuantity.toFixed(3)} ${item.unit}`)
      .join('; ');
    super(`Недостатньо залишків для списання: ${message}`);
    this.name = 'MenuStockShortageError';
    this.shortages = shortages;
  }
}
