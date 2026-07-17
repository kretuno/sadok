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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown, field: string, minimum = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`Поле "${field}" повинно бути числом не меншим за ${minimum}`);
  }
  return value;
};

const positiveInteger = (value: unknown, field: string) => {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`Поле "${field}" повинно бути додатним цілим числом`);
  }
  return Number(value);
};

const nonNegativeInteger = (value: unknown, field: string) => {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`Поле "${field}" повинно бути цілим числом не меншим за 0`);
  }
  return Number(value);
};

const optionalWeight = (value: unknown, field: string) =>
  value === null || value === undefined ? null : finiteNumber(value, field);

/** Validates untrusted HTTP input before menu calculations or persistence. */
export const validateDailyMenuInput = (value: unknown): DailyMenuInput => {
  if (!isRecord(value) || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
    throw new Error('Некоректна дата меню');
  }

  if (!Array.isArray(value.items)) {
    throw new Error('Поле "items" повинно бути масивом');
  }

  return {
    date: value.date,
    childrenCount0_4: nonNegativeInteger(value.childrenCount0_4, 'childrenCount0_4'),
    childrenCount5_7: nonNegativeInteger(value.childrenCount5_7, 'childrenCount5_7'),
    employeesCount: nonNegativeInteger(value.employeesCount, 'employeesCount'),
    targetPrice0_4: value.targetPrice0_4 === undefined ? null : optionalWeight(value.targetPrice0_4, 'targetPrice0_4'),
    targetPrice5_7: value.targetPrice5_7 === undefined ? null : optionalWeight(value.targetPrice5_7, 'targetPrice5_7'),
    items: value.items.map((item, itemIndex) => {
      if (!isRecord(item) || typeof item.mealType !== 'string' || item.mealType.trim() === '') {
        throw new Error(`Некоректна страва меню №${itemIndex + 1}`);
      }

      if (item.overrides !== undefined && !Array.isArray(item.overrides)) {
        throw new Error(`Поле "overrides" страви №${itemIndex + 1} повинно бути масивом`);
      }

      return {
        recipeId: positiveInteger(item.recipeId, `items[${itemIndex}].recipeId`),
        mealType: item.mealType.trim(),
        outputWeight0_4: optionalWeight(item.outputWeight0_4, `items[${itemIndex}].outputWeight0_4`),
        outputWeight5_7: optionalWeight(item.outputWeight5_7, `items[${itemIndex}].outputWeight5_7`),
        outputWeightEmployees: optionalWeight(item.outputWeightEmployees, `items[${itemIndex}].outputWeightEmployees`),
        overrides: (item.overrides ?? []).map((override, overrideIndex) => {
          if (!isRecord(override)) {
            throw new Error(`Некоректне коригування №${overrideIndex + 1} у страві №${itemIndex + 1}`);
          }

          const recipeIngredientId = override.recipeIngredientId === null || override.recipeIngredientId === undefined
            ? null
            : positiveInteger(override.recipeIngredientId, `items[${itemIndex}].overrides[${overrideIndex}].recipeIngredientId`);
          const productId = override.productId === null || override.productId === undefined
            ? null
            : positiveInteger(override.productId, `items[${itemIndex}].overrides[${overrideIndex}].productId`);

          if ((recipeIngredientId === null) === (productId === null)) {
            throw new Error(`Коригування №${overrideIndex + 1} у страві №${itemIndex + 1} повинно містити рівно один інгредієнт або продукт`);
          }

          return {
            recipeIngredientId,
            productId,
            subRecipeId: null,
            ageGroup: typeof override.ageGroup === 'string' && override.ageGroup.trim() ? override.ageGroup.trim() : 'common',
            grossWeight: finiteNumber(override.grossWeight, `items[${itemIndex}].overrides[${overrideIndex}].grossWeight`),
            netWeight: finiteNumber(override.netWeight, `items[${itemIndex}].overrides[${overrideIndex}].netWeight`),
          };
        }),
      };
    }),
  };
};

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
