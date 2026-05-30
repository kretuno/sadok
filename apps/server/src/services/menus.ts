import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  dailyMenus,
  menuItemIngredientOverrides,
  menuItemRecipes,
  productBatches,
  products,
  recipeIngredients,
  recipes,
} from '../db/schema';
import { adjustProductStock, restoreProductStock } from './stock';

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

interface IngredientDefinition {
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

interface ProductContribution {
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

interface ScaleFactors {
  scale0_4: number;
  scale5_7: number;
  scaleEmployees: number;
}

interface MenuAnalysisItemSource {
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

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  snack: 'Полуденок',
  dinner: 'Вечеря',
};

const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('Некоректна дата меню');
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const getDayRange = (value: string) => {
  const start = parseLocalDate(value);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const ensureNonNegativeWeight = (value: number | null | undefined, fieldName: string) => {
  if (value === undefined || value === null || !Number.isFinite(value) || Number(value) < 0) {
    throw new Error(`Поле "${fieldName}" повинно бути числом не меншим за 0`);
  }

  return round4(Number(value));
};

const getAgeGroupCounts = (
  ageGroup: string,
  menu: { childrenCount0_4: number; childrenCount5_7: number; employeesCount: number }
) => {
  if (ageGroup === '0-4') {
    return { count0_4: menu.childrenCount0_4, count5_7: 0, countEmployees: 0 };
  }

  if (ageGroup === '5-7') {
    return { count0_4: 0, count5_7: menu.childrenCount5_7, countEmployees: menu.employeesCount };
  }

  return { count0_4: menu.childrenCount0_4, count5_7: menu.childrenCount5_7, countEmployees: menu.employeesCount };
};

async function getMenuBase(menuId: number) {
  const menu = await db.query.dailyMenus.findFirst({
    where: eq(dailyMenus.id, menuId),
  });

  if (!menu) {
    throw new Error('Меню не знайдено');
  }

  return menu;
}

async function getMenuItemRows(menuId: number) {
  return db
    .select({
      id: menuItemRecipes.id,
      mealType: menuItemRecipes.mealType,
      recipeId: recipes.id,
      recipeName: recipes.name,
      recipeDishType: recipes.dishType,
      defaultOutputWeight: recipes.outputWeight,
      outputWeight0_4: menuItemRecipes.outputWeight0_4,
      outputWeight5_7: menuItemRecipes.outputWeight5_7,
      outputWeightEmployees: menuItemRecipes.outputWeightEmployees,
    })
    .from(menuItemRecipes)
    .innerJoin(recipes, eq(recipes.id, menuItemRecipes.recipeId))
    .where(eq(menuItemRecipes.menuId, menuId))
    .orderBy(asc(menuItemRecipes.id));
}

async function getRecipeIngredientDefinitions(
  recipeId: number,
  menuItemId?: number,
  cache = new Map<number, IngredientDefinition[]>()
): Promise<IngredientDefinition[]> {
  if (!cache.has(recipeId)) {
    const rows = await db
      .select({
        recipeIngredientId: recipeIngredients.id,
        recipeId: recipeIngredients.recipeId,
        productId: recipeIngredients.productId,
        subRecipeId: recipeIngredients.subRecipeId,
        ageGroup: recipeIngredients.ageGroup,
        grossWeight: recipeIngredients.grossWeight,
        netWeight: recipeIngredients.netWeight,
        productName: products.name,
        productUnit: products.unit,
        productPrice: products.currentPrice,
        subRecipeName: recipes.name,
        subRecipeOutputWeight: recipes.outputWeight,
      })
      .from(recipeIngredients)
      .leftJoin(products, eq(products.id, recipeIngredients.productId))
      .leftJoin(recipes, eq(recipes.id, recipeIngredients.subRecipeId))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.id));

    cache.set(
      recipeId,
      rows.map((row) => ({
        recipeIngredientId: row.recipeIngredientId,
        recipeId: row.recipeId,
        productId: row.productId,
        subRecipeId: row.subRecipeId,
        ageGroup: row.ageGroup,
        defaultGrossWeight: Number(row.grossWeight),
        defaultNetWeight: Number(row.netWeight),
        effectiveGrossWeight: Number(row.grossWeight),
        effectiveNetWeight: Number(row.netWeight),
        productName: row.productName,
        productUnit: row.productUnit,
        productPrice: Number(row.productPrice ?? 0),
        subRecipeName: row.subRecipeName,
        subRecipeOutputWeight: Number(row.subRecipeOutputWeight ?? 0),
        isAdjusted: false,
      }))
    );
  }

  const baseDefinitions = cache.get(recipeId) ?? [];
  const overridesMap = new Map<number, { grossWeight: number; netWeight: number }>();
  const customIngredients: IngredientDefinition[] = [];

  if (menuItemId) {
    const overrides = await db
      .select({
        id: menuItemIngredientOverrides.id,
        recipeIngredientId: menuItemIngredientOverrides.recipeIngredientId,
        productId: menuItemIngredientOverrides.productId,
        subRecipeId: menuItemIngredientOverrides.subRecipeId,
        ageGroup: menuItemIngredientOverrides.ageGroup,
        grossWeight: menuItemIngredientOverrides.grossWeight,
        netWeight: menuItemIngredientOverrides.netWeight,
        productName: products.name,
        productUnit: products.unit,
        productPrice: products.currentPrice,
        subRecipeName: recipes.name,
        subRecipeOutputWeight: recipes.outputWeight,
      })
      .from(menuItemIngredientOverrides)
      .leftJoin(products, eq(products.id, menuItemIngredientOverrides.productId))
      .leftJoin(recipes, eq(recipes.id, menuItemIngredientOverrides.subRecipeId))
      .where(eq(menuItemIngredientOverrides.menuItemId, menuItemId));

    overrides.forEach((override) => {
      if (override.recipeIngredientId) {
        overridesMap.set(override.recipeIngredientId, {
          grossWeight: Number(override.grossWeight),
          netWeight: Number(override.netWeight),
        });
      } else {
        customIngredients.push({
          recipeIngredientId: -override.id,
          recipeId: recipeId,
          productId: override.productId,
          subRecipeId: override.subRecipeId,
          ageGroup: override.ageGroup || 'common',
          defaultGrossWeight: 0,
          defaultNetWeight: 0,
          effectiveGrossWeight: Number(override.grossWeight),
          effectiveNetWeight: Number(override.netWeight),
          productName: override.productName,
          productUnit: override.productUnit,
          productPrice: Number(override.productPrice ?? 0),
          subRecipeName: override.subRecipeName,
          subRecipeOutputWeight: Number(override.subRecipeOutputWeight ?? 0),
          isAdjusted: true,
        });
      }
    });
  }

  const mappedBase = baseDefinitions.map((definition) => {
    const override = overridesMap.get(definition.recipeIngredientId);
    const effectiveGrossWeight = override ? Number(override.grossWeight) : definition.defaultGrossWeight;
    const effectiveNetWeight = override ? Number(override.netWeight) : definition.defaultNetWeight;

    return {
      ...definition,
      effectiveGrossWeight,
      effectiveNetWeight,
      isAdjusted: Boolean(
        override &&
        (round4(effectiveGrossWeight) !== round4(definition.defaultGrossWeight) ||
          round4(effectiveNetWeight) !== round4(definition.defaultNetWeight))
      ),
    };
  });

  return [...mappedBase, ...customIngredients];
}

const applyIngredientOverrides = async (
  ingredientDefinitions: IngredientDefinition[],
  overrides?: MenuItemIngredientOverrideInput[]
) => {
  if (!overrides || overrides.length === 0) {
    return ingredientDefinitions;
  }

  const overridesMap = new Map<number, { grossWeight: number; netWeight: number }>();
  const customIngredients: IngredientDefinition[] = [];

  const newProductOverrides = overrides.filter(o => o.recipeIngredientId === null && o.productId);
  let productsMap = new Map<number, any>();

  if (newProductOverrides.length > 0) {
    const productIds = newProductOverrides.map(o => o.productId!);
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));
    productsMap = new Map(dbProducts.map(p => [p.id, p]));
  }

  overrides.forEach((override, idx) => {
    if (override.recipeIngredientId) {
      overridesMap.set(override.recipeIngredientId, {
        grossWeight: ensureNonNegativeWeight(override.grossWeight, 'grossWeight'),
        netWeight: ensureNonNegativeWeight(override.netWeight, 'netWeight'),
      });
    } else if (override.productId) {
      const prod = productsMap.get(override.productId);
      customIngredients.push({
        recipeIngredientId: -(1000 + idx),
        recipeId: 0,
        productId: override.productId,
        subRecipeId: null,
        ageGroup: override.ageGroup || 'common',
        defaultGrossWeight: 0,
        defaultNetWeight: 0,
        effectiveGrossWeight: ensureNonNegativeWeight(override.grossWeight, 'grossWeight'),
        effectiveNetWeight: ensureNonNegativeWeight(override.netWeight, 'netWeight'),
        productName: prod?.name || 'Невідомий продукт',
        productUnit: prod?.unit || 'од.',
        productPrice: Number(prod?.currentPrice ?? 0),
        subRecipeName: null,
        subRecipeOutputWeight: 0,
        isAdjusted: true,
      });
    }
  });

  const mappedBase = ingredientDefinitions.map((definition) => {
    const override = overridesMap.get(definition.recipeIngredientId);

    if (!override) {
      return definition;
    }

    return {
      ...definition,
      effectiveGrossWeight: override.grossWeight,
      effectiveNetWeight: override.netWeight,
      isAdjusted:
        round4(override.grossWeight) !== round4(definition.defaultGrossWeight) ||
        round4(override.netWeight) !== round4(definition.defaultNetWeight),
    };
  });

  return [...mappedBase, ...customIngredients];
};

async function expandIngredientToProducts(
  ingredient: IngredientDefinition,
  menu: { childrenCount0_4: number; childrenCount5_7: number; employeesCount: number },
  cache = new Map<number, IngredientDefinition[]>(),
  scales: ScaleFactors = { scale0_4: 1, scale5_7: 1, scaleEmployees: 1 }
): Promise<ProductContribution[]> {
  if (ingredient.productId) {
    const { count0_4, count5_7, countEmployees } = getAgeGroupCounts(ingredient.ageGroup, menu);
    const grossQuantity0_4 = round4((ingredient.effectiveGrossWeight * scales.scale0_4 * count0_4) / 1000);
    const grossQuantity5_7 = round4((ingredient.effectiveGrossWeight * scales.scale5_7 * count5_7) / 1000);
    const grossQuantityEmployees = round4((ingredient.effectiveGrossWeight * scales.scaleEmployees * countEmployees) / 1000);
    
    const netQuantity0_4 = round4((ingredient.effectiveNetWeight * scales.scale0_4 * count0_4) / 1000);
    const netQuantity5_7 = round4((ingredient.effectiveNetWeight * scales.scale5_7 * count5_7) / 1000);
    const netQuantityEmployees = round4((ingredient.effectiveNetWeight * scales.scaleEmployees * countEmployees) / 1000);
    
    const cost0_4 = round2(grossQuantity0_4 * ingredient.productPrice);
    const cost5_7 = round2(grossQuantity5_7 * ingredient.productPrice);
    const costEmployees = round2(grossQuantityEmployees * ingredient.productPrice);

    return [{
      productId: ingredient.productId,
      productName: ingredient.productName ?? 'Невідомий продукт',
      unit: ingredient.productUnit ?? 'од.',
      grossQuantity0_4,
      grossQuantity5_7,
      grossQuantityEmployees,
      netQuantity0_4,
      netQuantity5_7,
      netQuantityEmployees,
      totalGrossQuantity: round4(grossQuantity0_4 + grossQuantity5_7 + grossQuantityEmployees),
      totalNetQuantity: round4(netQuantity0_4 + netQuantity5_7 + netQuantityEmployees),
      unitPrice: round2(ingredient.productPrice),
      cost0_4,
      cost5_7,
      costEmployees,
      totalCost: round2(cost0_4 + cost5_7 + costEmployees),
    }];
  }

  if (!ingredient.subRecipeId) {
    return [];
  }

  const outputWeight = Number(ingredient.subRecipeOutputWeight ?? 0);
  const nestedScales = outputWeight > 0
    ? {
      scale0_4: scales.scale0_4 * (ingredient.effectiveNetWeight / outputWeight),
      scale5_7: scales.scale5_7 * (ingredient.effectiveNetWeight / outputWeight),
      scaleEmployees: scales.scaleEmployees * (ingredient.effectiveNetWeight / outputWeight),
    }
    : scales;

  if (nestedScales.scale0_4 <= 0 && nestedScales.scale5_7 <= 0 && nestedScales.scaleEmployees <= 0) {
    return [];
  }

  const nestedIngredients = await getRecipeIngredientDefinitions(ingredient.subRecipeId, undefined, cache);
  const nestedProducts = await Promise.all(
    nestedIngredients.map((nestedIngredient) =>
      expandIngredientToProducts(nestedIngredient, menu, cache, nestedScales)
    )
  );

  return nestedProducts.flat();
}

const aggregateProducts = (productsList: ProductContribution[]) => {
  const bucket = new Map<number, ProductContribution>();

  productsList.forEach((line) => {
    const existing = bucket.get(line.productId);
    if (!existing) {
      bucket.set(line.productId, { ...line });
      return;
    }

    existing.grossQuantity0_4 = round4(existing.grossQuantity0_4 + line.grossQuantity0_4);
    existing.grossQuantity5_7 = round4(existing.grossQuantity5_7 + line.grossQuantity5_7);
    existing.grossQuantityEmployees = round4(existing.grossQuantityEmployees + line.grossQuantityEmployees);
    existing.netQuantity0_4 = round4(existing.netQuantity0_4 + line.netQuantity0_4);
    existing.netQuantity5_7 = round4(existing.netQuantity5_7 + line.netQuantity5_7);
    existing.netQuantityEmployees = round4(existing.netQuantityEmployees + line.netQuantityEmployees);
    existing.totalGrossQuantity = round4(existing.totalGrossQuantity + line.totalGrossQuantity);
    existing.totalNetQuantity = round4(existing.totalNetQuantity + line.totalNetQuantity);
    existing.cost0_4 = round2(existing.cost0_4 + line.cost0_4);
    existing.cost5_7 = round2(existing.cost5_7 + line.cost5_7);
    existing.costEmployees = round2(existing.costEmployees + line.costEmployees);
    existing.totalCost = round2(existing.totalCost + line.totalCost);
  });

  return Array.from(bucket.values()).sort((a, b) => a.productName.localeCompare(b.productName, 'uk'));
};

async function getMenuAnalysis(menuId: number) {
  const menu = await getMenuBase(menuId);
  const items = await getMenuItemRows(menuId);
  return buildMenuAnalysis({
    ...menu,
    isConfirmed: Boolean(menu.isConfirmed),
  }, items, async (item, cache) =>
    getRecipeIngredientDefinitions(item.recipeId, item.id, cache)
  );
}

async function buildMenuAnalysis(
  menu: {
    id: number;
    date: Date;
    childrenCount0_4: number;
    childrenCount5_7: number;
    employeesCount: number;
    targetPrice0_4?: number | null;
    targetPrice5_7?: number | null;
    isConfirmed: boolean;
    confirmedAt?: Date | null;
  },
  items: MenuAnalysisItemSource[],
  ingredientLoader: (
    item: MenuAnalysisItemSource,
    cache: Map<number, IngredientDefinition[]>
  ) => Promise<IngredientDefinition[]>
) {
  const cache = new Map<number, IngredientDefinition[]>();

  const detailedItems = await Promise.all(
    items.map(async (item) => {
      const ingredientDefinitions = await ingredientLoader(item, cache);
      const defaultOutputWeight = Number(item.defaultOutputWeight ?? 0);
      const outputWeight0_4 = Number(item.outputWeight0_4 ?? item.defaultOutputWeight ?? 0);
      const outputWeight5_7 = Number(item.outputWeight5_7 ?? item.defaultOutputWeight ?? 0);
      const outputWeightEmployees = Number(item.outputWeightEmployees ?? item.defaultOutputWeight ?? 0);
      const scales: ScaleFactors = {
        scale0_4: defaultOutputWeight > 0 && outputWeight0_4 > 0 ? outputWeight0_4 / defaultOutputWeight : 1,
        scale5_7: defaultOutputWeight > 0 && outputWeight5_7 > 0 ? outputWeight5_7 / defaultOutputWeight : 1,
        scaleEmployees: defaultOutputWeight > 0 && outputWeightEmployees > 0 ? outputWeightEmployees / defaultOutputWeight : 1,
      };
      const expandedProducts = await Promise.all(
        ingredientDefinitions.map((ingredient) => expandIngredientToProducts(ingredient, menu, cache, scales))
      );
      const aggregatedProducts = aggregateProducts(expandedProducts.flat());

      const cost0_4 = round2(aggregatedProducts.reduce((sum, line) => sum + line.cost0_4, 0));
      const cost5_7 = round2(aggregatedProducts.reduce((sum, line) => sum + line.cost5_7, 0));
      const costEmployees = round2(aggregatedProducts.reduce((sum, line) => sum + line.costEmployees, 0));
      const hasAdjustments = ingredientDefinitions.some((ingredient) => ingredient.isAdjusted);

      return {
        ...item,
        mealTypeLabel: MEAL_TYPE_LABELS[item.mealType] ?? item.mealType,
        defaultOutputWeight: Number(item.defaultOutputWeight ?? 0),
        outputWeight0_4: item.outputWeight0_4 !== null ? Number(item.outputWeight0_4) : null,
        outputWeight5_7: item.outputWeight5_7 !== null ? Number(item.outputWeight5_7) : null,
        outputWeightEmployees: item.outputWeightEmployees !== null ? Number(item.outputWeightEmployees) : null,
        hasAdjustments,
        adjustmentsCount: ingredientDefinitions.filter((ingredient) => ingredient.isAdjusted).length,
        ingredientAdjustments: ingredientDefinitions.map((ingredient) => ({
          recipeIngredientId: ingredient.recipeIngredientId,
          ageGroup: ingredient.ageGroup,
          sourceType: ingredient.productId ? 'product' : 'recipe',
          sourceName: ingredient.productId
            ? ingredient.productName ?? 'Невідомий продукт'
            : ingredient.subRecipeName ?? `Рецепт #${ingredient.subRecipeId}`,
          unit: ingredient.productId ? ingredient.productUnit ?? 'од.' : 'г',
          defaultGrossWeight: round4(ingredient.defaultGrossWeight),
          defaultNetWeight: round4(ingredient.defaultNetWeight),
          effectiveGrossWeight: round4(ingredient.effectiveGrossWeight),
          effectiveNetWeight: round4(ingredient.effectiveNetWeight),
          isAdjusted: ingredient.isAdjusted,
        })),
        productBreakdown: aggregatedProducts,
        cost0_4,
        cost5_7,
        costEmployees,
      };
    })
  );

  const summaryNeeds = aggregateProducts(detailedItems.flatMap((item) => item.productBreakdown));
  const hasAdjustments = detailedItems.some((item) => item.hasAdjustments);
  const status = menu.isConfirmed
    ? 'confirmed'
    : detailedItems.length === 0
      ? 'empty'
      : hasAdjustments
        ? 'adjusted'
        : 'draft';

  const totalCost0_4 = round2(summaryNeeds.reduce((sum, line) => sum + line.cost0_4, 0));
  const totalCost5_7 = round2(summaryNeeds.reduce((sum, line) => sum + line.cost5_7, 0));
  const totalCostEmployees = round2(summaryNeeds.reduce((sum, line) => sum + line.costEmployees, 0));
  const childrenCount0_4 = Number(menu.childrenCount0_4);
  const childrenCount5_7 = Number(menu.childrenCount5_7);
  const employeesCount = Number(menu.employeesCount);
  const costPerChild0_4 = childrenCount0_4 > 0 ? round2(totalCost0_4 / childrenCount0_4) : 0;
  const costPerChild5_7 = childrenCount5_7 > 0 ? round2(totalCost5_7 / childrenCount5_7) : 0;
  const costPerEmployee = employeesCount > 0 ? round2(totalCostEmployees / employeesCount) : 0;

  return {
    ...menu,
    isConfirmed: Boolean(menu.isConfirmed),
    status,
    hasAdjustments,
    itemsCount: detailedItems.length,
    items: detailedItems,
    summaryNeeds,
    totals: {
      totalChildren: childrenCount0_4 + childrenCount5_7,
      totalEmployees: employeesCount,
      costPerChild0_4,
      costPerChild5_7,
      costPerEmployee,
      totalCost0_4,
      totalCost5_7,
      totalCostEmployees,
      totalCostAll: round2(totalCost0_4 + totalCost5_7 + totalCostEmployees),
    },
  };
}

async function validateStockAvailability(needs: ProductContribution[]) {
  const productIds = needs.filter((need) => need.totalGrossQuantity > 0).map((need) => need.productId);

  if (productIds.length === 0) {
    return;
  }

  const availabilityRows = await db
    .select({
      productId: products.id,
      productName: products.name,
      unit: products.unit,
      availableQuantity: sql<number>`coalesce(sum(${productBatches.remainingQuantity}), 0)`,
    })
    .from(products)
    .leftJoin(productBatches, eq(productBatches.productId, products.id))
    .where(inArray(products.id, productIds))
    .groupBy(products.id);

  const availabilityMap = new Map(
    availabilityRows.map((row) => [
      row.productId,
      {
        productName: row.productName,
        unit: row.unit,
        availableQuantity: round4(Number(row.availableQuantity ?? 0)),
      },
    ])
  );

  const shortages: MenuStockShortageItem[] = needs
    .filter((need) => need.totalGrossQuantity > 0)
    .map((need) => {
      const availability = availabilityMap.get(need.productId);
      const availableQuantity = round4(availability?.availableQuantity ?? 0);
      const missingQuantity = round4(Math.max(0, need.totalGrossQuantity - availableQuantity));

      return {
        productId: need.productId,
        productName: need.productName,
        unit: need.unit,
        requiredQuantity: round4(need.totalGrossQuantity),
        availableQuantity,
        missingQuantity,
      };
    })
    .filter((item) => item.missingQuantity > 0);

  if (shortages.length > 0) {
    throw new MenuStockShortageError(shortages);
  }
}

export async function getMenusRange(startDate: string, endDate: string) {
  const { start } = getDayRange(startDate);
  const { end } = getDayRange(endDate);

  const menus = await db
    .select()
    .from(dailyMenus)
    .where(and(gte(dailyMenus.date, start), lte(dailyMenus.date, end)))
    .orderBy(asc(dailyMenus.date));

  return Promise.all(
    menus.map(async (menu) => {
      const items = await db
        .select({ id: menuItemRecipes.id })
        .from(menuItemRecipes)
        .where(eq(menuItemRecipes.menuId, menu.id));

      const hasAdjustments = items.length > 0
        ? (
          await Promise.all(
            items.map(async (item) => {
              const override = await db.query.menuItemIngredientOverrides.findFirst({
                where: eq(menuItemIngredientOverrides.menuItemId, item.id),
              });
              return Boolean(override);
            })
          )
        ).some(Boolean)
        : false;

      return {
        ...menu,
        itemsCount: items.length,
        hasAdjustments,
        status: menu.isConfirmed
          ? 'confirmed'
          : items.length === 0
            ? 'empty'
            : hasAdjustments
              ? 'adjusted'
              : 'draft',
      };
    })
  );
}

export async function getMenuDetails(menuId: number) {
  return getMenuAnalysis(menuId);
}

export async function previewMenu(input: DailyMenuInput) {
  const { start: menuDate } = getDayRange(input.date);
  const recipeIds = input.items.map((item) => item.recipeId);
  const recipeRows = recipeIds.length > 0
    ? await db
      .select({
        id: recipes.id,
        name: recipes.name,
        dishType: recipes.dishType,
        outputWeight: recipes.outputWeight,
      })
      .from(recipes)
      .where(inArray(recipes.id, recipeIds))
    : [];

  const recipeMap = new Map(
    recipeRows.map((recipe) => [
      recipe.id,
      {
        name: recipe.name,
        dishType: recipe.dishType,
        outputWeight: Number(recipe.outputWeight ?? 0),
      },
    ])
  );

  const items: MenuAnalysisItemSource[] = input.items.map((item, index) => {
    const recipe = recipeMap.get(item.recipeId);

    if (!recipe) {
      throw new Error(`Рецепт #${item.recipeId} не знайдено`);
    }

    return {
      id: -(index + 1),
      mealType: item.mealType,
      recipeId: item.recipeId,
      recipeName: recipe.name,
      recipeDishType: recipe.dishType,
      defaultOutputWeight: recipe.outputWeight,
      outputWeight0_4: item.outputWeight0_4 ?? null,
      outputWeight5_7: item.outputWeight5_7 ?? null,
      outputWeightEmployees: item.outputWeightEmployees ?? null,
      overrides: item.overrides ?? [],
    };
  });

  return buildMenuAnalysis(
    {
      id: 0,
      date: menuDate,
      childrenCount0_4: input.childrenCount0_4,
      childrenCount5_7: input.childrenCount5_7,
      employeesCount: input.employeesCount,
      targetPrice0_4: input.targetPrice0_4,
      targetPrice5_7: input.targetPrice5_7,
      isConfirmed: false,
      confirmedAt: null,
    },
    items,
    async (item, cache) => {
      const ingredientDefinitions = await getRecipeIngredientDefinitions(item.recipeId, undefined, cache);
      return await applyIngredientOverrides(ingredientDefinitions, item.overrides);
    }
  );
}

export async function createOrUpdateMenu(input: DailyMenuInput) {
  const { start: menuDate, end: menuDateEnd } = getDayRange(input.date);

  let menu = await db.query.dailyMenus.findFirst({
    where: and(gte(dailyMenus.date, menuDate), lte(dailyMenus.date, menuDateEnd)),
  });

  if (menu?.isConfirmed) {
    throw new Error('Не можна редагувати вже підтверджене меню');
  }

  if (menu) {
    await db
      .update(dailyMenus)
      .set({
        childrenCount0_4: input.childrenCount0_4,
        childrenCount5_7: input.childrenCount5_7,
        employeesCount: input.employeesCount,
        targetPrice0_4: input.targetPrice0_4,
        targetPrice5_7: input.targetPrice5_7,
      })
      .where(eq(dailyMenus.id, menu.id));
  } else {
    const inserted = await db
      .insert(dailyMenus)
      .values({
        date: menuDate,
        childrenCount0_4: input.childrenCount0_4,
        childrenCount5_7: input.childrenCount5_7,
        employeesCount: input.employeesCount,
        targetPrice0_4: input.targetPrice0_4,
        targetPrice5_7: input.targetPrice5_7,
      })
      .returning();

    menu = inserted[0];
  }

  await db.delete(menuItemRecipes).where(eq(menuItemRecipes.menuId, menu.id));

  if (input.items.length > 0) {
    const insertedItems = await db
      .insert(menuItemRecipes)
      .values(
        input.items.map((item) => ({
          menuId: menu!.id,
          recipeId: item.recipeId,
          mealType: item.mealType,
          outputWeight0_4: item.outputWeight0_4,
          outputWeight5_7: item.outputWeight5_7,
          outputWeightEmployees: item.outputWeightEmployees,
        }))
      )
      .returning({ id: menuItemRecipes.id });

    const overrideRows: Array<{
      menuItemId: number;
      recipeIngredientId: number | null;
      productId: number | null;
      subRecipeId: number | null;
      ageGroup: string | null;
      grossWeight: number;
      netWeight: number;
    }> = [];

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      const insertedItem = insertedItems[index];
      const recipeIngredientRows = await db
        .select({
          id: recipeIngredients.id,
          grossWeight: recipeIngredients.grossWeight,
          netWeight: recipeIngredients.netWeight,
        })
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, item.recipeId));

      const defaults = new Map(
        recipeIngredientRows.map((row) => [
          row.id,
          {
            grossWeight: Number(row.grossWeight),
            netWeight: Number(row.netWeight),
          },
        ])
      );

      (item.overrides ?? []).forEach((override) => {
        const grossWeight = ensureNonNegativeWeight(override.grossWeight, 'grossWeight');
        const netWeight = ensureNonNegativeWeight(override.netWeight, 'netWeight');

        if (override.recipeIngredientId) {
          const original = defaults.get(override.recipeIngredientId);
          if (!original) {
            return;
          }

          if (
            round4(grossWeight) === round4(original.grossWeight) &&
            round4(netWeight) === round4(original.netWeight)
          ) {
            return;
          }

          overrideRows.push({
            menuItemId: insertedItem.id,
            recipeIngredientId: override.recipeIngredientId,
            productId: null,
            subRecipeId: null,
            ageGroup: null,
            grossWeight,
            netWeight,
          });
        } else if (override.productId) {
          overrideRows.push({
            menuItemId: insertedItem.id,
            recipeIngredientId: null,
            productId: override.productId,
            subRecipeId: null,
            ageGroup: override.ageGroup || 'common',
            grossWeight,
            netWeight,
          });
        }
      });
    }

    if (overrideRows.length > 0) {
      await db.insert(menuItemIngredientOverrides).values(overrideRows);
    }
  }

  return getMenuDetails(menu.id);
}

export async function calculateMenuRequirement(menuId: number) {
  const menu = await getMenuAnalysis(menuId);
  return menu.summaryNeeds;
}

export async function confirmMenu(menuId: number, userId?: number) {
  const menu = await db.query.dailyMenus.findFirst({
    where: eq(dailyMenus.id, menuId),
  });

  if (!menu) {
    throw new Error('Меню не знайдено');
  }

  if (menu.isConfirmed) {
    throw new Error('Меню вже підтверджено');
  }

  const needs = await calculateMenuRequirement(menuId);
  await validateStockAvailability(needs);

  for (const need of needs) {
    if (need.totalGrossQuantity <= 0) {
      continue;
    }

    await adjustProductStock({
      productId: need.productId,
      quantity: need.totalGrossQuantity,
      reason: `Списання згідно меню від ${menu.date.toLocaleDateString('uk-UA')}`,
      userId,
    });
  }

  await db
    .update(dailyMenus)
    .set({
      isConfirmed: true,
      confirmedAt: new Date(),
    })
    .where(eq(dailyMenus.id, menuId));

  return getMenuDetails(menuId);
}

export async function cancelMenuConfirmation(menuId: number, userId?: number) {
  const menu = await db.query.dailyMenus.findFirst({
    where: eq(dailyMenus.id, menuId),
  });

  if (!menu) {
    throw new Error('Меню не знайдено');
  }

  if (!menu.isConfirmed) {
    throw new Error('Меню ще не підтверджено');
  }

  const needs = await calculateMenuRequirement(menuId);

  for (const need of needs) {
    if (need.totalGrossQuantity <= 0) {
      continue;
    }

    await restoreProductStock({
      productId: need.productId,
      quantity: need.totalGrossQuantity,
      reason: `Повернення згідно скасування меню від ${menu.date.toLocaleDateString('uk-UA')}`,
      userId,
    });
  }

  await db
    .update(dailyMenus)
    .set({
      isConfirmed: false,
      confirmedAt: null,
    })
    .where(eq(dailyMenus.id, menuId));

  return getMenuDetails(menuId);
}

export async function getMenuPrintData(menuId: number) {
  const menu = await getMenuAnalysis(menuId);

  return {
    menu: {
      ...menu,
      mealTypeLabels: MEAL_TYPE_LABELS,
    },
    items: menu.items,
    summaryNeeds: menu.summaryNeeds,
    totals: menu.totals,
  };
}
