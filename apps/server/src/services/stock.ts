import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  invoiceItems,
  invoices,
  productBatches,
  productPriceHistory,
  products,
  stockMovements,
  suppliers,
} from '../db/schema';

type Database = typeof db;
type TxDatabase = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface InvoiceItemInput {
  productId?: number;
  productName?: string;
  unit?: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  expiryDate?: string | null;
}

export interface CreateInvoiceInput {
  invoiceNumber: string;
  date: string;
  supplierId?: number;
  supplierName?: string;
  supplierEdrpou?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierNotes?: string | null;
  basis?: string | null;
  vatAmount?: number;
  isDraft?: boolean;
  items: InvoiceItemInput[];
  userId?: number;
}

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

async function getOrCreateSupplier(tx: Database | TxDatabase, input: CreateInvoiceInput) {
  if (input.supplierId) {
    const existingSupplier = await tx.query.suppliers.findFirst({
      where: eq(suppliers.id, input.supplierId),
    });

    if (!existingSupplier) {
      throw new Error('Постачальника не знайдено');
    }

    return existingSupplier.id;
  }

  const supplierName = ensureNonEmpty(input.supplierName, 'Постачальник');
  const existingByName = await tx.query.suppliers.findFirst({
    where: eq(suppliers.name, supplierName),
  });

  if (existingByName) {
    return existingByName.id;
  }

  const inserted = await tx
    .insert(suppliers)
    .values({
      name: supplierName,
      edrpou: input.supplierEdrpou?.trim() || null,
      contacts: input.supplierPhone?.trim() || input.supplierEmail?.trim() || null,
      phone: input.supplierPhone?.trim() || null,
      email: input.supplierEmail?.trim() || null,
      address: input.supplierAddress?.trim() || null,
      notes: input.supplierNotes?.trim() || null,
    })
    .returning({ id: suppliers.id });

  return inserted[0].id;
}

async function getOrCreateProduct(tx: Database | TxDatabase, item: InvoiceItemInput) {
  if (item.productId) {
    const existingProduct = await tx.query.products.findFirst({
      where: eq(products.id, item.productId),
    });

    if (!existingProduct) {
      throw new Error(`Продукт з ID ${item.productId} не знайдено`);
    }

    return existingProduct;
  }

  const productName = ensureNonEmpty(item.productName, 'Назва продукту');
  const unit = ensureNonEmpty(item.unit, 'Одиниця виміру');

  const existingByName = await tx.query.products.findFirst({
    where: eq(products.name, productName),
  });

  if (existingByName) {
    return existingByName;
  }

  const inserted = await tx
    .insert(products)
    .values({
      name: productName,
      unit,
      category: item.category?.trim() || null,
    })
    .returning();

  return inserted[0];
}

async function recalculateProductWac(tx: Database | TxDatabase, productId: number, reason: string, referenceId?: number) {
  const totals = await tx
    .select({
      totalQuantity: sql<number>`coalesce(sum(${productBatches.remainingQuantity}), 0)`,
      totalValue: sql<number>`coalesce(sum(${productBatches.remainingQuantity} * ${productBatches.pricePerUnit}), 0)`,
    })
    .from(productBatches)
    .where(eq(productBatches.productId, productId));

  const totalQuantity = Number(totals[0]?.totalQuantity ?? 0);
  const totalValue = Number(totals[0]?.totalValue ?? 0);

  if (totalQuantity <= 0) {
    return 0;
  }

  const nextPrice = round2(totalValue / totalQuantity);

  await tx.update(products).set({ currentPrice: nextPrice }).where(eq(products.id, productId));

  await tx.insert(productPriceHistory).values({
    productId,
    price: nextPrice,
    reason,
    referenceId,
  });

  return nextPrice;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const invoiceNumber = ensureNonEmpty(input.invoiceNumber, 'Номер накладної');

  if (!input.items.length) {
    throw new Error('Накладна повинна містити хоча б одну позицію');
  }

  const supplierId = await getOrCreateSupplier(db, input);

  const preparedItems = await Promise.all(
    input.items.map(async (item) => {
      ensurePositiveNumber(item.quantity, 'Кількість');
      ensurePositiveNumber(item.unitPrice, 'Ціна');
      const product = await getOrCreateProduct(db, item);

      return {
        product,
        quantity: round4(item.quantity),
        unitPrice: round2(item.unitPrice),
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      };
    })
  );

  const itemsTotal = preparedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = round2(itemsTotal + (input.vatAmount ?? 0));

  const insertedInvoice = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      date: new Date(input.date),
      supplierId,
      basis: input.basis?.trim() || null,
      vatAmount: round2(input.vatAmount ?? 0),
      totalAmount,
      isDraft: input.isDraft ?? false,
      status: input.isDraft ? 'draft' : 'posted',
      postedAt: input.isDraft ? null : new Date(),
      createdBy: input.userId ?? null,
    })
    .returning();

  const invoice = insertedInvoice[0];

  for (const preparedItem of preparedItems) {
    const lineTotal = round2(preparedItem.quantity * preparedItem.unitPrice);
    const insertedItem = await db
      .insert(invoiceItems)
      .values({
        invoiceId: invoice.id,
        productId: preparedItem.product.id,
        quantity: preparedItem.quantity,
        unitPrice: preparedItem.unitPrice,
        totalPrice: lineTotal,
        expiryDate: preparedItem.expiryDate,
      })
      .returning();

    if (!input.isDraft) {
      const batch = await db
        .insert(productBatches)
        .values({
          productId: preparedItem.product.id,
          arrivalDate: new Date(input.date),
          initialQuantity: preparedItem.quantity,
          remainingQuantity: preparedItem.quantity,
          pricePerUnit: preparedItem.unitPrice,
          invoiceId: invoice.id,
          invoiceItemId: insertedItem[0].id,
          expiryDate: preparedItem.expiryDate,
        })
        .returning();

      await db.insert(stockMovements).values({
        productId: preparedItem.product.id,
        batchId: batch[0].id,
        invoiceId: invoice.id,
        type: 'in',
        quantity: preparedItem.quantity,
        priceAtMoment: preparedItem.unitPrice,
        reason: `Накладна ${invoice.invoiceNumber}`,
        userId: input.userId ?? null,
      });

      await recalculateProductWac(db, preparedItem.product.id, 'invoice', invoice.id);
    }
  }

  return getInvoiceDetails(db, invoice.id);
}

export async function getInventoryOverview(search?: string) {
  const searchTerm = search?.trim() ? `%${search.trim().toLowerCase()}%` : null;

  const rawProducts = await db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      currentPrice: products.currentPrice,
      minStock: products.minStock,
      category: products.category,
      notes: products.notes,
      createdAt: products.createdAt,
      stockQuantity: sql<number>`coalesce(sum(${productBatches.remainingQuantity}), 0)`,
      totalValue: sql<number>`coalesce(sum(${productBatches.remainingQuantity} * ${productBatches.pricePerUnit}), 0)`,
    })
    .from(products)
    .leftJoin(productBatches, eq(productBatches.productId, products.id))
    .where(and(
      searchTerm ? sql`lower(${products.name}) like ${searchTerm}` : undefined,
      eq(products.isArchived, false)
    ))
    .groupBy(products.id)
    .orderBy(asc(products.name));

  return rawProducts.map((product) => ({
    ...product,
    stockQuantity: Number(product.stockQuantity ?? 0),
    totalValue: round2(Number(product.totalValue ?? 0)),
    isLowStock: Number(product.stockQuantity ?? 0) <= Number(product.minStock ?? 0),
  }));
}

export async function getProductCard(productId: number) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    throw new Error('Продукт не знайдено');
  }

  const batches = await db
    .select({
      id: productBatches.id,
      arrivalDate: productBatches.arrivalDate,
      initialQuantity: productBatches.initialQuantity,
      remainingQuantity: productBatches.remainingQuantity,
      pricePerUnit: productBatches.pricePerUnit,
      expiryDate: productBatches.expiryDate,
      invoiceId: productBatches.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      supplierName: suppliers.name,
    })
    .from(productBatches)
    .leftJoin(invoices, eq(invoices.id, productBatches.invoiceId))
    .leftJoin(suppliers, eq(suppliers.id, invoices.supplierId))
    .where(eq(productBatches.productId, productId))
    .orderBy(asc(productBatches.arrivalDate), asc(productBatches.id));

  const movements = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      priceAtMoment: stockMovements.priceAtMoment,
      date: stockMovements.date,
      reason: stockMovements.reason,
      batchId: stockMovements.batchId,
      invoiceId: stockMovements.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(stockMovements)
    .leftJoin(invoices, eq(invoices.id, stockMovements.invoiceId))
    .where(eq(stockMovements.productId, productId))
    .orderBy(asc(stockMovements.date), asc(stockMovements.id));

  let runningBalance = 0;
  const timeline = movements.map((movement) => {
    const quantity = Number(movement.quantity);
    const signedQuantity = movement.type === 'out' ? -quantity : quantity;
    runningBalance = round4(runningBalance + signedQuantity);

    return {
      ...movement,
      quantity,
      priceAtMoment: round2(Number(movement.priceAtMoment)),
      runningBalance,
    };
  });

  return {
    product,
    batches: batches.map((batch) => ({
      ...batch,
      initialQuantity: Number(batch.initialQuantity),
      remainingQuantity: Number(batch.remainingQuantity),
      pricePerUnit: round2(Number(batch.pricePerUnit)),
    })),
    movements: timeline,
  };
}

export async function getInvoicesOverview() {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      postedAt: invoices.postedAt,
      supplierName: suppliers.name,
      itemsCount: sql<number>`count(${invoiceItems.id})`,
    })
    .from(invoices)
    .leftJoin(suppliers, eq(suppliers.id, invoices.supplierId))
    .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.date), desc(invoices.id));

  return rows.map((row) => ({
    ...row,
    totalAmount: round2(Number(row.totalAmount)),
    itemsCount: Number(row.itemsCount ?? 0),
  }));
}

export async function getSuppliersOverview() {
  const rows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      edrpou: suppliers.edrpou,
      phone: suppliers.phone,
      email: suppliers.email,
      address: suppliers.address,
      notes: suppliers.notes,
      invoicesCount: sql<number>`count(${invoices.id})`,
      totalPurchased: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(suppliers)
    .leftJoin(invoices, eq(invoices.supplierId, suppliers.id))
    .where(eq(suppliers.isArchived, false))
    .groupBy(suppliers.id)
    .orderBy(asc(suppliers.name));

  return rows.map((row) => ({
    ...row,
    invoicesCount: Number(row.invoicesCount ?? 0),
    totalPurchased: round2(Number(row.totalPurchased ?? 0)),
  }));
}

export async function createSupplier(input: {
  name: string;
  edrpou?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  const name = ensureNonEmpty(input.name, 'Назва постачальника');

  const existingSupplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.name, name),
  });

  if (existingSupplier) {
    throw new Error('Постачальник з такою назвою вже існує');
  }

  const inserted = await db
    .insert(suppliers)
    .values({
      name,
      edrpou: input.edrpou?.trim() || null,
      contacts: input.phone?.trim() || input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning();

  return inserted[0];
}

export async function createProduct(input: {
  name: string;
  unit: string;
  category?: string | null;
  minStock?: number;
  notes?: string | null;
}) {
  const name = ensureNonEmpty(input.name, 'Назва продукту');
  const unit = ensureNonEmpty(input.unit, 'Одиниця виміру');

  const existingProduct = await db.query.products.findFirst({
    where: eq(products.name, name),
  });

  if (existingProduct) {
    throw new Error('Продукт з такою назвою вже існує');
  }

  const inserted = await db
    .insert(products)
    .values({
      name,
      unit,
      category: input.category?.trim() || null,
      minStock: round4(input.minStock ?? 0),
      notes: input.notes?.trim() || null,
    })
    .returning();

  return inserted[0];
}

export async function adjustProductStock(input: {
  productId: number;
  quantity: number;
  reason: string;
  userId?: number;
}) {
  ensurePositiveNumber(input.quantity, 'Кількість');
  const reason = ensureNonEmpty(input.reason, 'Причина');

  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });

  if (!product) {
    throw new Error('Продукт не знайдено');
  }

  const batches = await db.query.productBatches.findMany({
    where: and(
      eq(productBatches.productId, input.productId),
      sql`${productBatches.remainingQuantity} > 0`
    ),
    orderBy: [asc(productBatches.arrivalDate), asc(productBatches.id)],
  });

  let quantityToWriteOff = round4(input.quantity);
  const totalAvailable = round4(
    batches.reduce((sum, batch) => sum + Number(batch.remainingQuantity), 0)
  );

  if (quantityToWriteOff > totalAvailable) {
    throw new Error('Недостатньо залишку для списання');
  }

  for (const batch of batches) {
    if (quantityToWriteOff <= 0) {
      break;
    }

    const available = Number(batch.remainingQuantity);
    const consumeQuantity = round4(Math.min(available, quantityToWriteOff));

    await db
      .update(productBatches)
      .set({
        remainingQuantity: round4(available - consumeQuantity),
      })
      .where(eq(productBatches.id, batch.id));

    await db.insert(stockMovements).values({
      productId: input.productId,
      batchId: batch.id,
      invoiceId: batch.invoiceId ?? null,
      type: 'out',
      quantity: consumeQuantity,
      priceAtMoment: Number(batch.pricePerUnit),
      reason,
      userId: input.userId ?? null,
    });

    quantityToWriteOff = round4(quantityToWriteOff - consumeQuantity);
  }

  await recalculateProductWac(db, input.productId, 'manual_adjustment');

  return getProductCard(input.productId);
}

export async function addProductStockManually(input: {
  productId: number;
  quantity: number;
  unitPrice: number;
  reason: string;
  userId?: number;
}) {
  ensurePositiveNumber(input.quantity, 'Кількість');
  ensurePositiveNumber(input.unitPrice, 'Ціна');
  const reason = ensureNonEmpty(input.reason, 'Причина');

  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });

  if (!product) {
    throw new Error('Продукт не знайдено');
  }

  const quantity = round4(input.quantity);
  const unitPrice = round2(input.unitPrice);

  const batch = await db
    .insert(productBatches)
    .values({
      productId: input.productId,
      arrivalDate: new Date(),
      initialQuantity: quantity,
      remainingQuantity: quantity,
      pricePerUnit: unitPrice,
      invoiceId: null,
      invoiceItemId: null,
      expiryDate: null,
    })
    .returning();

  await db.insert(stockMovements).values({
    productId: input.productId,
    batchId: batch[0].id,
    invoiceId: null,
    type: 'in',
    quantity,
    priceAtMoment: unitPrice,
    reason,
    userId: input.userId ?? null,
  });

  await recalculateProductWac(db, input.productId, 'manual_restock');

  return getProductCard(input.productId);
}

export async function restoreProductStock(input: {
  productId: number;
  quantity: number;
  reason: string;
  userId?: number;
}) {
  ensurePositiveNumber(input.quantity, 'Кількість');
  const reason = ensureNonEmpty(input.reason, 'Причина');

  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });

  if (!product) {
    throw new Error('Продукт не знайдено');
  }

  const quantity = round4(input.quantity);
  const pricePerUnit = round2(Number(product.currentPrice ?? 0));

  const batch = await db
    .insert(productBatches)
    .values({
      productId: input.productId,
      arrivalDate: new Date(),
      initialQuantity: quantity,
      remainingQuantity: quantity,
      pricePerUnit,
      invoiceId: null,
      invoiceItemId: null,
      expiryDate: null,
    })
    .returning();

  await db.insert(stockMovements).values({
    productId: input.productId,
    batchId: batch[0].id,
    invoiceId: null,
    type: 'in',
    quantity,
    priceAtMoment: pricePerUnit,
    reason,
    userId: input.userId ?? null,
  });

  await recalculateProductWac(db, input.productId, 'menu_cancel_return');

  return getProductCard(input.productId);
}

export async function getInvoiceDetails(txOrDb: Database | TxDatabase, invoiceId: number) {
  const invoice = await txOrDb
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      basis: invoices.basis,
      vatAmount: invoices.vatAmount,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      postedAt: invoices.postedAt,
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      supplierEdrpou: suppliers.edrpou,
    })
    .from(invoices)
    .leftJoin(suppliers, eq(suppliers.id, invoices.supplierId))
    .where(eq(invoices.id, invoiceId));

  if (!invoice[0]) {
    throw new Error('Накладну не знайдено');
  }

  const items = await txOrDb
    .select({
      id: invoiceItems.id,
      productId: products.id,
      productName: products.name,
      unit: products.unit,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      totalPrice: invoiceItems.totalPrice,
      expiryDate: invoiceItems.expiryDate,
    })
    .from(invoiceItems)
    .leftJoin(products, eq(products.id, invoiceItems.productId))
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.id));

  return {
    ...invoice[0],
    vatAmount: round2(Number(invoice[0].vatAmount)),
    totalAmount: round2(Number(invoice[0].totalAmount)),
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: round2(Number(item.unitPrice)),
      totalPrice: round2(Number(item.totalPrice)),
    })),
  };
}

export async function postInvoice(invoiceId: number, userId?: number) {
  return await db.transaction(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        items: true
      }
    });

    if (!invoice) throw new Error('Накладну не знайдено');
    if (invoice.status === 'posted') throw new Error('Накладна вже проведена');

    for (const item of invoice.items) {
      const batch = await tx.insert(productBatches).values({
        productId: item.productId,
        arrivalDate: invoice.date,
        initialQuantity: item.quantity,
        remainingQuantity: item.quantity,
        pricePerUnit: item.unitPrice,
        invoiceId: invoice.id,
        invoiceItemId: item.id,
        expiryDate: item.expiryDate,
      }).returning();

      await tx.insert(stockMovements).values({
        productId: item.productId,
        batchId: batch[0].id,
        invoiceId: invoice.id,
        type: 'in',
        quantity: item.quantity,
        priceAtMoment: item.unitPrice,
        reason: `Проведення накладної ${invoice.invoiceNumber}`,
        userId: userId ?? null,
      });

      await recalculateProductWac(tx, item.productId, 'invoice_post', invoice.id);
    }

    await tx.update(invoices).set({
      status: 'posted',
      isDraft: false,
      postedAt: new Date()
    }).where(eq(invoices.id, invoiceId));

    return getInvoiceDetails(tx, invoiceId);
  });
}

export async function deleteInvoice(invoiceId: number) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId)
  });

  if (!invoice) throw new Error('Накладну не знайдено');
  if (invoice.status === 'posted') {
    throw new Error('Неможливо видалити проведену накладну. Тільки чернетки можна видаляти.');
  }

  await db.delete(invoices).where(eq(invoices.id, invoiceId));
  return { success: true };
}

export async function updateProduct(productId: number, data: Partial<{ name: string; unit: string; category: string; minStock: number; notes: string }>) {
  await db.update(products).set({
    ...data,
    minStock: data.minStock !== undefined ? round4(data.minStock) : undefined
  }).where(eq(products.id, productId));
  
  return db.query.products.findFirst({ where: eq(products.id, productId) });
}

export async function archiveProduct(productId: number) {
  await db.update(products).set({ isArchived: true }).where(eq(products.id, productId));
  return { success: true };
}

export async function updateSupplier(supplierId: number, data: Partial<{ name: string; edrpou: string; phone: string; email: string; address: string; notes: string }>) {
  await db.update(suppliers).set(data).where(eq(suppliers.id, supplierId));
  return db.query.suppliers.findFirst({ where: eq(suppliers.id, supplierId) });
}

export async function archiveSupplier(supplierId: number) {
  await db.update(suppliers).set({ isArchived: true }).where(eq(suppliers.id, supplierId));
  return { success: true };
}
