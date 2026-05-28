import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  menuItemRecipes,
  products,
  recipeIngredients,
  recipes,
} from '../db/schema';

type Database = typeof db;
type TxDatabase = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface RecipeIngredientInput {
  productId?: number;
  subRecipeId?: number;
  ageGroup: string;
  grossWeight: number;
  netWeight: number;
}

export interface RecipeInput {
  name: string;
  dishType?: string | null;
  techCard?: string | null;
  outputWeight?: number | null;
  isBaseRecipe?: boolean;
  ingredients?: RecipeIngredientInput[];
}

interface RecipeCostLine {
  ingredientId: number;
  ageGroup: string;
  sourceType: 'product' | 'recipe';
  sourceId: number;
  sourceName: string;
  grossWeight: number;
  netWeight: number;
  usageQuantity: number;
  usageUnit: string;
  unitPrice: number;
  cost: number;
}

interface RecipeCostSummary {
  common: number;
  byAgeGroup: Record<string, number>;
  costPer100g: Record<string, number>;
  lines: RecipeCostLine[];
}

const RECIPE_AGE_GROUPS = ['common', '0-4', '5-7'] as const;

const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

const getErrorMessage = (fieldName: string) => `Поле "${fieldName}" є обов'язковим`;

const ensureNonEmpty = (value: string | undefined | null, fieldName: string) => {
  if (!value || !value.trim()) {
    throw new Error(getErrorMessage(fieldName));
  }

  return value.trim();
};

const ensureNonNegativeNumber = (value: number | null | undefined, fieldName: string) => {
  if (value === undefined || value === null || !Number.isFinite(value) || value < 0) {
    throw new Error(`Поле "${fieldName}" не може бути меншим за 0`);
  }

  return Number(value);
};

const ensurePositiveNumber = (value: number | null | undefined, fieldName: string) => {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Поле "${fieldName}" повинно бути більшим за 0`);
  }

  return Number(value);
};

const normalizeAgeGroup = (ageGroup: string | undefined | null) => {
  const normalized = ensureNonEmpty(ageGroup, 'вікова група').toLowerCase();

  if (!RECIPE_AGE_GROUPS.includes(normalized as (typeof RECIPE_AGE_GROUPS)[number])) {
    throw new Error('Вікова група повинна бути однією з: common, 0-4, 5-7');
  }

  return normalized;
};

const normalizeUnit = (unit: string | null | undefined) => unit?.trim().toLowerCase() ?? '';

const convertWeightToProductUnits = (weight: number, unit: string | null | undefined) => {
  const normalizedUnit = normalizeUnit(unit);

  if (['кг', 'kg', 'kilogram', 'kilograms'].includes(normalizedUnit)) {
    return round4(weight / 1000);
  }

  if (['г', 'гр', 'g', 'gram', 'grams'].includes(normalizedUnit)) {
    return round4(weight);
  }

  if (['л', 'l', 'liter', 'liters'].includes(normalizedUnit)) {
    return round4(weight / 1000);
  }

  if (['мл', 'ml', 'milliliter', 'milliliters'].includes(normalizedUnit)) {
    return round4(weight);
  }

  return round4(weight);
};

const buildCostBuckets = (common: number, specific: Partial<Record<'0-4' | '5-7', number>>) => ({
  common: round2(common),
  byAgeGroup: {
    '0-4': round2(common + (specific['0-4'] ?? 0)),
    '5-7': round2(common + (specific['5-7'] ?? 0)),
  },
});

async function assertRecipeExists(tx: Database | TxDatabase, recipeId: number) {
  const recipe = await tx.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
  });

  if (!recipe) {
    throw new Error('Рецепт не знайдено');
  }

  return recipe;
}

async function assertProductExists(tx: Database | TxDatabase, productId: number) {
  const product = await tx.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    throw new Error(`Продукт з ID ${productId} не знайдено`);
  }

  return product;
}

async function assertNoRecipeCycles(
  tx: Database | TxDatabase,
  rootRecipeId: number,
  subRecipeId: number,
  visited = new Set<number>()
): Promise<void> {
  if (rootRecipeId === subRecipeId) {
    throw new Error('Рецепт не може посилатися сам на себе');
  }

  if (visited.has(subRecipeId)) {
    return;
  }

  visited.add(subRecipeId);

  const nestedIngredients = await tx.query.recipeIngredients.findMany({
    where: eq(recipeIngredients.recipeId, subRecipeId),
    columns: {
      subRecipeId: true,
    },
  });

  for (const nestedIngredient of nestedIngredients) {
    if (!nestedIngredient.subRecipeId) {
      continue;
    }

    if (nestedIngredient.subRecipeId === rootRecipeId) {
      throw new Error('Виявлено циклічний звʼязок між рецептами');
    }

    await assertNoRecipeCycles(tx, rootRecipeId, nestedIngredient.subRecipeId, visited);
  }
}

async function validateIngredientInput(
  tx: Database | TxDatabase,
  recipeId: number,
  ingredient: RecipeIngredientInput
) {
  const hasProduct = Boolean(ingredient.productId);
  const hasSubRecipe = Boolean(ingredient.subRecipeId);

  if (hasProduct === hasSubRecipe) {
    throw new Error('Інгредієнт повинен містити або продукт, або вкладений рецепт');
  }

  const normalizedAgeGroup = normalizeAgeGroup(ingredient.ageGroup);
  const grossWeight = ensureNonNegativeNumber(ingredient.grossWeight, 'брутто');
  const netWeight = ensurePositiveNumber(ingredient.netWeight, 'нетто');

  if (hasProduct && ingredient.productId) {
    await assertProductExists(tx, ingredient.productId);
  }

  if (hasSubRecipe && ingredient.subRecipeId) {
    await assertRecipeExists(tx, ingredient.subRecipeId);
    await assertNoRecipeCycles(tx, recipeId, ingredient.subRecipeId);
  }

  return {
    productId: ingredient.productId ?? null,
    subRecipeId: ingredient.subRecipeId ?? null,
    ageGroup: normalizedAgeGroup,
    grossWeight: round4(grossWeight),
    netWeight: round4(netWeight),
  };
}

async function replaceRecipeIngredients(
  tx: Database | TxDatabase,
  recipeId: number,
  ingredientsInput: RecipeIngredientInput[]
) {
  await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));

  if (!ingredientsInput.length) {
    return;
  }

  const normalizedIngredients = [];

  for (const ingredient of ingredientsInput) {
    normalizedIngredients.push(await validateIngredientInput(tx, recipeId, ingredient));
  }

  await tx.insert(recipeIngredients).values(
    normalizedIngredients.map((ingredient) => ({
      recipeId,
      ...ingredient,
    }))
  );
}

async function getRecipeIngredientRows(tx: Database | TxDatabase, recipeId: number) {
  return tx
    .select({
      id: recipeIngredients.id,
      recipeId: recipeIngredients.recipeId,
      productId: recipeIngredients.productId,
      subRecipeId: recipeIngredients.subRecipeId,
      ageGroup: recipeIngredients.ageGroup,
      grossWeight: recipeIngredients.grossWeight,
      netWeight: recipeIngredients.netWeight,
      productName: products.name,
      productUnit: products.unit,
      productCurrentPrice: products.currentPrice,
      subRecipeName: sql<string | null>`sub_recipe.name`,
      subRecipeOutputWeight: sql<number | null>`sub_recipe.output_weight`,
    })
    .from(recipeIngredients)
    .leftJoin(products, eq(products.id, recipeIngredients.productId))
    .leftJoin(sql`${recipes} as sub_recipe`, sql`sub_recipe.id = ${recipeIngredients.subRecipeId}`)
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.id));
}

async function calculateRecipeCostSummary(
  recipeId: number,
  visited = new Set<number>()
): Promise<RecipeCostSummary> {
  if (visited.has(recipeId)) {
    throw new Error('Виявлено повторний обхід рецепта під час розрахунку собівартості');
  }

  visited.add(recipeId);

  const recipe = await assertRecipeExists(db, recipeId);
  const ingredientsRows = await getRecipeIngredientRows(db, recipeId);

  const lines: RecipeCostLine[] = [];
  let commonCost = 0;
  const specificCost: Partial<Record<'0-4' | '5-7', number>> = {};

  for (const ingredient of ingredientsRows) {
    const grossWeight = Number(ingredient.grossWeight);
    const netWeight = Number(ingredient.netWeight);
    const ageGroup = ingredient.ageGroup;

    if (ingredient.productId) {
      const usageQuantity = convertWeightToProductUnits(netWeight, ingredient.productUnit);
      const unitPrice = round2(Number(ingredient.productCurrentPrice ?? 0));
      const cost = round2(usageQuantity * unitPrice);

      lines.push({
        ingredientId: ingredient.id,
        ageGroup,
        sourceType: 'product',
        sourceId: ingredient.productId,
        sourceName: ingredient.productName ?? `Продукт #${ingredient.productId}`,
        grossWeight,
        netWeight,
        usageQuantity,
        usageUnit: ingredient.productUnit ?? 'од.',
        unitPrice,
        cost,
      });

      if (ageGroup === 'common') {
        commonCost += cost;
      } else if (ageGroup === '0-4' || ageGroup === '5-7') {
        specificCost[ageGroup] = round2((specificCost[ageGroup] ?? 0) + cost);
      }

      continue;
    }

    if (ingredient.subRecipeId) {
      const nestedCost = await calculateRecipeCostSummary(ingredient.subRecipeId, new Set(visited));
      const nestedOutputWeight = Number(ingredient.subRecipeOutputWeight ?? 0);
      const proportion = nestedOutputWeight > 0 ? netWeight / nestedOutputWeight : 1;
      const usageQuantity = round4(proportion);

      let nestedUnitPrice = nestedOutputWeight > 0
        ? round4(nestedCost.byAgeGroup['5-7'] / nestedOutputWeight)
        : nestedCost.byAgeGroup['5-7'];

      if (!Number.isFinite(nestedUnitPrice)) {
        nestedUnitPrice = 0;
      }

      const costByAgeGroup = {
        common: round2(nestedCost.common * proportion),
        '0-4': round2(nestedCost.byAgeGroup['0-4'] * proportion),
        '5-7': round2(nestedCost.byAgeGroup['5-7'] * proportion),
      };

      lines.push({
        ingredientId: ingredient.id,
        ageGroup,
        sourceType: 'recipe',
        sourceId: ingredient.subRecipeId,
        sourceName: ingredient.subRecipeName ?? `Рецепт #${ingredient.subRecipeId}`,
        grossWeight,
        netWeight,
        usageQuantity,
        usageUnit: nestedOutputWeight > 0 ? 'частка рецепта' : 'рецепт',
        unitPrice: round4(nestedUnitPrice),
        cost: ageGroup === '0-4'
          ? costByAgeGroup['0-4']
          : ageGroup === '5-7'
            ? costByAgeGroup['5-7']
            : costByAgeGroup.common,
      });

      if (ageGroup === 'common') {
        commonCost += costByAgeGroup.common;
      } else if (ageGroup === '0-4' || ageGroup === '5-7') {
        specificCost[ageGroup] = round2((specificCost[ageGroup] ?? 0) + costByAgeGroup[ageGroup]);
      }
    }
  }

  const buckets = buildCostBuckets(commonCost, specificCost);
  const outputWeight = Number(recipe.outputWeight ?? 0);

  return {
    common: buckets.common,
    byAgeGroup: buckets.byAgeGroup,
    costPer100g: {
      '0-4': outputWeight > 0 ? round2((buckets.byAgeGroup['0-4'] / outputWeight) * 100) : 0,
      '5-7': outputWeight > 0 ? round2((buckets.byAgeGroup['5-7'] / outputWeight) * 100) : 0,
    },
    lines,
  };
}

export async function getRecipesOverview(search?: string) {
  const searchTerm = search?.trim() ? `%${search.trim().toLowerCase()}%` : null;

  const recipesRows = await db
    .select({
      id: recipes.id,
      name: recipes.name,
      dishType: recipes.dishType,
      outputWeight: recipes.outputWeight,
      isBaseRecipe: recipes.isBaseRecipe,
      createdAt: recipes.createdAt,
      ingredientsCount: sql<number>`count(${recipeIngredients.id})`,
    })
    .from(recipes)
    .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .where(
      searchTerm
        ? sql`lower(${recipes.name}) like ${searchTerm}`
        : undefined
    )
    .groupBy(recipes.id)
    .orderBy(asc(recipes.name));

  return Promise.all(
    recipesRows.map(async (recipe) => {
      const cost = await calculateRecipeCostSummary(recipe.id);

      return {
        ...recipe,
        outputWeight: Number(recipe.outputWeight ?? 0),
        isBaseRecipe: Boolean(recipe.isBaseRecipe),
        ingredientsCount: Number(recipe.ingredientsCount ?? 0),
        cost,
      };
    })
  );
}

export async function getRecipeDetails(recipeId: number) {
  const recipe = await assertRecipeExists(db, recipeId);
  const ingredientsRows = await getRecipeIngredientRows(db, recipeId);
  const cost = await calculateRecipeCostSummary(recipeId);

  return {
    recipe: {
      ...recipe,
      outputWeight: Number(recipe.outputWeight ?? 0),
      isBaseRecipe: Boolean(recipe.isBaseRecipe),
    },
    ingredients: ingredientsRows.map((ingredient) => ({
      id: ingredient.id,
      recipeId: ingredient.recipeId,
      productId: ingredient.productId,
      subRecipeId: ingredient.subRecipeId,
      ageGroup: ingredient.ageGroup,
      grossWeight: Number(ingredient.grossWeight),
      netWeight: Number(ingredient.netWeight),
      productName: ingredient.productName,
      productUnit: ingredient.productUnit,
      productCurrentPrice: ingredient.productCurrentPrice !== null
        ? round2(Number(ingredient.productCurrentPrice))
        : null,
      subRecipeName: ingredient.subRecipeName,
      subRecipeOutputWeight: ingredient.subRecipeOutputWeight !== null
        ? Number(ingredient.subRecipeOutputWeight)
        : null,
    })),
    cost,
  };
}

export async function createRecipe(input: RecipeInput) {
  const name = ensureNonEmpty(input.name, 'назва рецепта');
  const outputWeight = input.outputWeight === undefined || input.outputWeight === null
    ? null
    : round4(ensurePositiveNumber(input.outputWeight, 'вихід страви'));

  const existingRecipe = await db.query.recipes.findFirst({
    where: eq(recipes.name, name),
  });

  if (existingRecipe) {
    throw new Error('Рецепт з такою назвою вже існує');
  }

  const insertedRecipe = await db
    .insert(recipes)
    .values({
      name,
      dishType: input.dishType?.trim() || null,
      techCard: input.techCard?.trim() || null,
      outputWeight,
      isBaseRecipe: input.isBaseRecipe ?? false,
    })
    .returning();

  const recipe = insertedRecipe[0];

  await replaceRecipeIngredients(db, recipe.id, input.ingredients ?? []);

  return getRecipeDetails(recipe.id);
}

export async function updateRecipe(recipeId: number, input: RecipeInput) {
  const recipe = await assertRecipeExists(db, recipeId);
  const name = ensureNonEmpty(input.name, 'назва рецепта');
  const outputWeight = input.outputWeight === undefined || input.outputWeight === null
    ? null
    : round4(ensurePositiveNumber(input.outputWeight, 'вихід страви'));

  const existingRecipeWithName = await db.query.recipes.findFirst({
    where: and(eq(recipes.name, name), sql`${recipes.id} <> ${recipeId}`),
  });

  if (existingRecipeWithName) {
    throw new Error('Рецепт з такою назвою вже існує');
  }

  await db
    .update(recipes)
    .set({
      name,
      dishType: input.dishType?.trim() || null,
      techCard: input.techCard?.trim() || null,
      outputWeight,
      isBaseRecipe: input.isBaseRecipe ?? recipe.isBaseRecipe ?? false,
    })
    .where(eq(recipes.id, recipeId));

  if (input.ingredients) {
    await replaceRecipeIngredients(db, recipeId, input.ingredients);
  }

  return getRecipeDetails(recipeId);
}

export async function deleteRecipe(recipeId: number) {
  await assertRecipeExists(db, recipeId);

  const usedInRecipes = await db.query.recipeIngredients.findFirst({
    where: eq(recipeIngredients.subRecipeId, recipeId),
  });

  if (usedInRecipes) {
    throw new Error('Не можна видалити рецепт, якщо він використовується в інших рецептах');
  }

  const usedInMenus = await db.query.menuItemRecipes.findFirst({
    where: eq(menuItemRecipes.recipeId, recipeId),
  });

  if (usedInMenus) {
    throw new Error('Не можна видалити рецепт, якщо він використовується в меню');
  }

  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
  await db.delete(recipes).where(eq(recipes.id, recipeId));

  return { success: true };
}

export async function addRecipeIngredient(recipeId: number, input: RecipeIngredientInput) {
  await assertRecipeExists(db, recipeId);

  const ingredient = await validateIngredientInput(db, recipeId, input);

  const inserted = await db
    .insert(recipeIngredients)
    .values({
      recipeId,
      ...ingredient,
    })
    .returning();

  return {
    ingredient: inserted[0],
    details: await getRecipeDetails(recipeId),
  };
}

export async function updateRecipeIngredient(
  recipeId: number,
  ingredientId: number,
  input: RecipeIngredientInput
) {
  await assertRecipeExists(db, recipeId);

  const existingIngredient = await db.query.recipeIngredients.findFirst({
    where: and(eq(recipeIngredients.id, ingredientId), eq(recipeIngredients.recipeId, recipeId)),
  });

  if (!existingIngredient) {
    throw new Error('Інгредієнт рецепта не знайдено');
  }

  const normalizedIngredient = await validateIngredientInput(db, recipeId, input);

  await db
    .update(recipeIngredients)
    .set(normalizedIngredient)
    .where(eq(recipeIngredients.id, ingredientId));

  return getRecipeDetails(recipeId);
}

export async function deleteRecipeIngredient(recipeId: number, ingredientId: number) {
  await assertRecipeExists(db, recipeId);

  const existingIngredient = await db.query.recipeIngredients.findFirst({
    where: and(eq(recipeIngredients.id, ingredientId), eq(recipeIngredients.recipeId, recipeId)),
  });

  if (!existingIngredient) {
    throw new Error('Інгредієнт рецепта не знайдено');
  }

  await db.delete(recipeIngredients).where(eq(recipeIngredients.id, ingredientId));

  return getRecipeDetails(recipeId);
}
