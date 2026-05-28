import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { products } from '../db/schema';
import { AuthRequest } from '../middleware/auth';
import {
  archiveProduct,
  createProduct,
  getInventoryOverview,
  getProductCard,
  updateProduct,
  adjustProductStock,
  addProductStockManually,
} from '../services/stock';
import { getClientIp, logAuditEvent } from '../services/audit';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Невідома помилка';
};

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const allProducts = await getInventoryOverview(search);
    res.json(allProducts);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при завантаженні складу', error: getErrorMessage(error) });
  }
};

export const createProductHandler = async (req: AuthRequest, res: Response) => {
  try {
    const product = await createProduct(req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'create',
      entity: 'products',
      entityId: product.id,
      newValue: product,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getProductCardHandler = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const card = await getProductCard(productId);
    res.json(card);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Продукт не знайдено' ? 404 : 400).json({ message });
  }
};

export const adjustProductStockHandler = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const result = await adjustProductStock({
      productId,
      quantity: Number(req.body.quantity),
      reason: req.body.reason,
      userId: req.user?.id,
    });

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'adjust_stock',
      entity: 'products',
      entityId: productId,
      newValue: {
        quantity: Number(req.body.quantity),
        reason: req.body.reason,
        result,
      },
      ipAddress: getClientIp(req),
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const addProductStockManuallyHandler = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const result = await addProductStockManually({
      productId,
      quantity: Number(req.body.quantity),
      unitPrice: Number(req.body.unitPrice),
      reason: req.body.reason,
      userId: req.user?.id,
    });

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'manual_restock',
      entity: 'products',
      entityId: productId,
      newValue: {
        quantity: Number(req.body.quantity),
        unitPrice: Number(req.body.unitPrice),
        reason: req.body.reason,
        result,
      },
      ipAddress: getClientIp(req),
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateProductHandler = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    const product = await updateProduct(productId, req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'update',
      entity: 'products',
      entityId: productId,
      oldValue: existingProduct,
      newValue: product,
      ipAddress: getClientIp(req),
    });

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const archiveProductHandler = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    const result = await archiveProduct(productId);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'archive',
      entity: 'products',
      entityId: productId,
      oldValue: existingProduct,
      newValue: result,
      ipAddress: getClientIp(req),
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
