import { desc, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import {
  dailyMenus,
  invoiceItems,
  invoices,
  productBatches,
  productPriceHistory,
  products,
  stockMovements,
  suppliers,
} from './schema';
import { calculateMenuRequirement } from '../services/menus';

type SeedMode = 'full' | 'edge';

const TEST_SUPPLIER_NAME = 'Тестовий постачальник меню';
const TEST_INVOICE_BASIS = 'Тестові дані для перевірки меню';

const PRICE_BY_NAME: Record<string, number> = {
  'Буряк': 18,
  'Варення сливове': 145,
  'Вершкове масло': 420,
  'Вода': 1,
  'Гарбуз свіжий': 22,
  'Капуста свіжа': 20,
  'Картопля': 24,
  'Крохмаль кукурудзяний': 110,
  'Крупа кукурудзяна': 38,
  "М'ясо курки (філе)": 182,
  'Молоко': 42,
  'Морква': 19,
  'Олія соняшникова': 72,
  'Рис': 56,
  'Сир твердий': 310,
  'Сметана': 96,
  'Томатна паста': 88,
  'Цибуля ріпчаста': 17,
  'Ягоди зам. (смородина, малина)': 175,
  'Яйця курячі': 6,
};

const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

function normalizeUnit(unit: string | null | undefined) {
  return unit?.trim().toLowerCase() ?? '';
}

function getDefaultPrice(productName: string, unit: string) {
  if (PRICE_BY_NAME[productName] !== undefined) {
    return PRICE_BY_NAME[productName];
  }

  const normalizedUnit = normalizeUnit(unit);

  if (normalizedUnit === 'шт') {
    return 6;
  }

  if (normalizedUnit === 'л') {
    return 35;
  }

  return 60;
}

function getSeedQuantity(requiredQuantity: number, unit: string) {
  const normalizedUnit = normalizeUnit(unit);
  const multiplied = requiredQuantity * 4;

  if (normalizedUnit === 'шт') {
    return round4(Math.max(multiplied, 80));
  }

  if (normalizedUnit === 'л') {
    return round4(Math.max(multiplied, 8));
  }

  return round4(Math.max(multiplied, 4));
}

async function getLatestMenu() {
  const rows = await db
    .select({
      id: dailyMenus.id,
      date: dailyMenus.date,
      isConfirmed: dailyMenus.isConfirmed,
    })
    .from(dailyMenus)
    .orderBy(desc(dailyMenus.date), desc(dailyMenus.id))
    .limit(1);

  return rows[0] ?? null;
}

async function cleanupPreviousMenuTestInvoices() {
  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.name, TEST_SUPPLIER_NAME),
  });

  if (!supplier) {
    return;
  }

  const testInvoices = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.supplierId, supplier.id));

  const invoiceIds = testInvoices.map((invoice) => invoice.id);

  if (!invoiceIds.length) {
    return;
  }

  await db.delete(stockMovements).where(inArray(stockMovements.invoiceId, invoiceIds));
  await db.delete(productBatches).where(inArray(productBatches.invoiceId, invoiceIds));
  await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
  await db.delete(invoices).where(inArray(invoices.id, invoiceIds));
}

async function ensureTestSupplierId() {
  const existingSupplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.name, TEST_SUPPLIER_NAME),
  });

  if (existingSupplier) {
    return existingSupplier.id;
  }

  const insertedSuppliers = await db
    .insert(suppliers)
    .values({
      name: TEST_SUPPLIER_NAME,
      notes: TEST_INVOICE_BASIS,
    })
    .returning({ id: suppliers.id });

  return insertedSuppliers[0].id;
}

async function seedFullMenuData() {
  await cleanupPreviousMenuTestInvoices();

  const latestMenu = await getLatestMenu();

  if (!latestMenu) {
    throw new Error('У базі немає жодного меню для підготовки тестових даних');
  }

  const needs = await calculateMenuRequirement(latestMenu.id);

  if (!needs.length) {
    throw new Error('Для останнього меню не вдалося розрахувати потребу в продуктах');
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
    })
    .from(products)
    .where(inArray(products.id, needs.map((need) => need.productId)));

  const productMap = new Map(productRows.map((row) => [row.id, row]));

  const items = needs.map((need) => {
    const product = productMap.get(need.productId);

    if (!product) {
      throw new Error(`Не знайдено продукт з ID ${need.productId} для тестового наповнення`);
    }

    return {
      productId: product.id,
      quantity: getSeedQuantity(need.quantity, product.unit),
      unitPrice: getDefaultPrice(product.name, product.unit),
    };
  });

  const now = new Date();
  const invoiceNumber = `MENU-TEST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const totalCost = round2(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  );

  const supplierId = await ensureTestSupplierId();
  const insertedInvoices = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      date: now,
      supplierId,
      basis: TEST_INVOICE_BASIS,
      vatAmount: 0,
      totalAmount: totalCost,
      isDraft: false,
      status: 'posted',
      postedAt: now,
      createdBy: null,
    })
    .returning({ id: invoices.id });

  const invoiceId = insertedInvoices[0].id;

  for (const item of items) {
    const insertedInvoiceItems = await db
      .insert(invoiceItems)
      .values({
        invoiceId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: round2(item.quantity * item.unitPrice),
        expiryDate: null,
      })
      .returning({ id: invoiceItems.id });

    const invoiceItemId = insertedInvoiceItems[0].id;

    const insertedBatches = await db
      .insert(productBatches)
      .values({
        productId: item.productId,
        arrivalDate: now,
        initialQuantity: item.quantity,
        remainingQuantity: item.quantity,
        pricePerUnit: item.unitPrice,
        invoiceId,
        invoiceItemId,
        expiryDate: null,
      })
      .returning({ id: productBatches.id });

    await db.insert(stockMovements).values({
      productId: item.productId,
      batchId: insertedBatches[0].id,
      invoiceId,
      type: 'in',
      quantity: item.quantity,
      priceAtMoment: item.unitPrice,
      reason: TEST_INVOICE_BASIS,
      userId: null,
    });

    await db
      .update(products)
      .set({
        currentPrice: item.unitPrice,
      })
      .where(eq(products.id, item.productId));

    await db.insert(productPriceHistory).values({
      productId: item.productId,
      price: item.unitPrice,
      reason: 'menu_test_seed',
      referenceId: invoiceId,
    });
  }

  return {
    menuId: latestMenu.id,
    productsSeeded: items.length,
    totalCost,
    items,
  };
}

async function applyEdgeCases() {
  const latestMenu = await getLatestMenu();

  if (!latestMenu) {
    throw new Error('У базі немає меню для підготовки edge-case тестів');
  }

  const needs = await calculateMenuRequirement(latestMenu.id);
  const zeroStockTarget = needs.find((need) => need.productName === 'Молоко') ?? needs[0];
  const zeroPriceTarget = needs.find((need) => need.productName === 'Томатна паста') ?? needs[1] ?? needs[0];

  if (!zeroStockTarget || !zeroPriceTarget) {
    throw new Error('Не вдалося підібрати продукти для edge-case тестів меню');
  }

  const stockBatches = await db
    .select({
      id: productBatches.id,
      invoiceId: productBatches.invoiceId,
      remainingQuantity: productBatches.remainingQuantity,
      pricePerUnit: productBatches.pricePerUnit,
    })
    .from(productBatches)
    .where(eq(productBatches.productId, zeroStockTarget.productId));

  const totalAvailable = round4(
    stockBatches.reduce((sum, batch) => sum + Number(batch.remainingQuantity), 0)
  );

  for (const batch of stockBatches) {
    const remainingQuantity = Number(batch.remainingQuantity);

    if (remainingQuantity <= 0) {
      continue;
    }

    await db
      .update(productBatches)
      .set({
        remainingQuantity: 0,
      })
      .where(eq(productBatches.id, batch.id));

    await db.insert(stockMovements).values({
      productId: zeroStockTarget.productId,
      batchId: batch.id,
      invoiceId: batch.invoiceId ?? null,
      type: 'out',
      quantity: remainingQuantity,
      priceAtMoment: Number(batch.pricePerUnit),
      reason: 'Тестовий сценарій нульового залишку для меню',
      userId: null,
    });
  }

  await db
    .update(products)
    .set({
      currentPrice: 0,
    })
    .where(eq(products.id, zeroPriceTarget.productId));

  await db.insert(productPriceHistory).values({
    productId: zeroPriceTarget.productId,
    price: 0,
    reason: 'menu_test_zero_price',
    referenceId: latestMenu.id,
  });

  return {
    zeroStockProduct: zeroStockTarget.productName,
    zeroPriceProduct: zeroPriceTarget.productName,
  };
}

async function main() {
  const mode = (process.argv[2] ?? 'full') as SeedMode;

  if (!['full', 'edge'].includes(mode)) {
    throw new Error('Режим має бути "full" або "edge"');
  }

  console.log(`Починаємо підготовку тестових даних меню у режимі "${mode}"...`);

  const fullResult = await seedFullMenuData();
  console.log(`Створено тестове наповнення для меню #${fullResult.menuId}.`);
  console.log(`Додано/оновлено ${fullResult.productsSeeded} складських позицій.`);
  console.log(`Сумарна тестова вартість приходу: ${fullResult.totalCost}`);

  if (mode === 'edge') {
    const edgeResult = await applyEdgeCases();
    console.log(`Нульовий залишок підготовлено для продукту: ${edgeResult.zeroStockProduct}`);
    console.log(`Нульову ціну встановлено для продукту: ${edgeResult.zeroPriceProduct}`);
  }

  console.log('Тестові дані меню готові.');
}

main()
  .catch((error) => {
    console.error('Помилка підготовки тестових даних меню:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
