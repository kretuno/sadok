import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import {
  productBatches,
  productPriceHistory,
  products,
  stockMovements,
} from '../db/schema';

type Database = BetterSQLite3Database<typeof schema>;
export type StockTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

const ensurePositiveNumber = (value: number, fieldName: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Поле "${fieldName}" повинно бути більшим за 0`);
  }
};

const ensureNonEmpty = (value: string | undefined | null, fieldName: string) => {
  if (!value || !value.trim()) {
    throw new Error(`Поле "${fieldName}" є обов'язковим`);
  }

  return value.trim();
};

function recalculateProductWac(
  tx: StockTransaction,
  productId: number,
  reason: string,
  referenceId?: number
) {
  const totals = tx
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productBatches.remainingQuantity}), 0)`,
      totalValue: sql<number>`coalesce(sum(${productBatches.remainingQuantity} * ${productBatches.pricePerUnit}), 0)`,
    })
    .from(productBatches)
    .where(eq(productBatches.productId, productId))
    .all();

  const totalQuantity = Number(totals[0]?.totalQuantity ?? 0);
  if (totalQuantity <= 0) return 0;

  const nextPrice = round2(Number(totals[0]?.totalValue ?? 0) / totalQuantity);
  tx.update(products).set({ currentPrice: nextPrice }).where(eq(products.id, productId)).run();
  tx.insert(productPriceHistory).values({
    productId,
    price: nextPrice,
    reason,
    referenceId,
  }).run();
  return nextPrice;
}

export interface AdjustProductStockInput {
  productId: number;
  quantity: number;
  reason: string;
  userId?: number;
  menuId?: number;
}

export function deductProductStock(tx: StockTransaction, input: AdjustProductStockInput) {
  ensurePositiveNumber(input.quantity, 'Кількість');
  const reason = ensureNonEmpty(input.reason, 'Причина');

  const product = tx.query.products.findFirst({
    where: eq(products.id, input.productId),
  }).sync();

  if (!product) {
    throw new Error('Продукт не знайдено');
  }

  const batches = tx.query.productBatches.findMany({
    where: and(
      eq(productBatches.productId, input.productId),
      sql`${productBatches.remainingQuantity} > 0`
    ),
    orderBy: [asc(productBatches.arrivalDate), asc(productBatches.id)],
  }).sync();

  let quantityToWriteOff = round4(input.quantity);
  const totalAvailable = round4(
    batches.reduce((sum, batch) => sum + Number(batch.remainingQuantity), 0)
  );

  if (quantityToWriteOff > totalAvailable) {
    throw new Error('Недостатньо залишку для списання');
  }

  for (const batch of batches) {
    if (quantityToWriteOff <= 0) break;

    const available = Number(batch.remainingQuantity);
    const consumeQuantity = round4(Math.min(available, quantityToWriteOff));

    tx.update(productBatches)
      .set({ remainingQuantity: round4(available - consumeQuantity) })
      .where(eq(productBatches.id, batch.id))
      .run();
    tx.insert(stockMovements).values({
      productId: input.productId,
      batchId: batch.id,
      invoiceId: batch.invoiceId ?? null,
      type: 'out',
      quantity: consumeQuantity,
      priceAtMoment: Number(batch.pricePerUnit),
      reason,
      userId: input.userId ?? null,
      menuId: input.menuId ?? null,
    }).run();

    quantityToWriteOff = round4(quantityToWriteOff - consumeQuantity);
  }

  recalculateProductWac(
    tx,
    input.productId,
    input.menuId ? 'menu_confirmation' : 'manual_adjustment',
    input.menuId
  );
}

export interface MenuStockDeduction {
  id: number;
  productId: number;
  batchId: number | null;
  quantity: number;
  priceAtMoment: number;
}

export function getOutstandingMenuStockDeductions(
  tx: StockTransaction,
  menuId: number,
  legacyReason: string
): MenuStockDeduction[] {
  const candidates = tx
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      batchId: stockMovements.batchId,
      quantity: stockMovements.quantity,
      priceAtMoment: stockMovements.priceAtMoment,
    })
    .from(stockMovements)
    .where(and(
      eq(stockMovements.type, 'out'),
      or(
        eq(stockMovements.menuId, menuId),
        and(isNull(stockMovements.menuId), eq(stockMovements.reason, legacyReason))
      )
    ))
    .all()
    .map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      priceAtMoment: Number(row.priceAtMoment),
    }));

  if (candidates.length === 0) return [];

  const reversedRows = tx
    .select({ movementId: stockMovements.reversalOfMovementId })
    .from(stockMovements)
    .where(inArray(stockMovements.reversalOfMovementId, candidates.map((row) => row.id)))
    .all();
  const reversedIds = new Set(
    reversedRows
      .map((row) => row.movementId)
      .filter((movementId): movementId is number => movementId !== null)
  );

  return candidates.filter((candidate) => !reversedIds.has(candidate.id));
}

export function restoreMenuStockDeductions(
  tx: StockTransaction,
  deductions: MenuStockDeduction[],
  input: { menuId: number; reason: string; userId?: number }
) {
  const reason = ensureNonEmpty(input.reason, 'Причина');
  const touchedProducts = new Set<number>();

  for (const deduction of deductions) {
    if (!deduction.batchId) {
      throw new Error(`Для складського руху #${deduction.id} не знайдено партію`);
    }

    const batch = tx.query.productBatches.findFirst({
      where: eq(productBatches.id, deduction.batchId),
    }).sync();
    if (!batch) {
      throw new Error(`Партію для складського руху #${deduction.id} не знайдено`);
    }

    tx.update(productBatches)
      .set({ remainingQuantity: round4(Number(batch.remainingQuantity) + deduction.quantity) })
      .where(eq(productBatches.id, batch.id))
      .run();
    tx.insert(stockMovements).values({
      productId: deduction.productId,
      batchId: batch.id,
      invoiceId: batch.invoiceId ?? null,
      type: 'in',
      quantity: round4(deduction.quantity),
      priceAtMoment: round2(deduction.priceAtMoment),
      reason,
      userId: input.userId ?? null,
      menuId: input.menuId,
      reversalOfMovementId: deduction.id,
    }).run();
    touchedProducts.add(deduction.productId);
  }

  for (const productId of touchedProducts) {
    recalculateProductWac(tx, productId, 'menu_cancel_return', input.menuId);
  }
}
