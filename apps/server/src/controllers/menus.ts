import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { dailyMenus } from '../db/schema';
import { AuthRequest } from '../middleware/auth';
import {
  calculateMenuRequirement,
  cancelMenuConfirmation,
  confirmMenu,
  createOrUpdateMenu,
  getMenuDetails,
  getMenuPrintData,
  getMenusRange,
  MenuStockShortageError,
  previewMenu,
} from '../services/menus';
import { getClientIp, logAuditEvent } from '../services/audit';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
};

export const getMenusHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      throw new Error("Параметри start та end є обов'язковими (YYYY-MM-DD)");
    }
    const data = await getMenusRange(String(start), String(end));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getMenuByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getMenuDetails(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: getErrorMessage(error) });
  }
};

export const upsertMenuHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createOrUpdateMenu(req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'upsert',
      entity: 'menus',
      entityId: data.id,
      newValue: {
        id: data.id,
        date: data.date,
        isConfirmed: data.isConfirmed,
        childrenCount0_4: data.childrenCount0_4,
        childrenCount5_7: data.childrenCount5_7,
        itemsCount: Array.isArray(data.items) ? data.items.length : undefined,
      },
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const previewMenuHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await previewMenu(req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getMenuNeedsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await calculateMenuRequirement(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const confirmMenuHandler = async (req: AuthRequest, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const before = await db.query.dailyMenus.findFirst({
      where: eq(dailyMenus.id, menuId),
    });
    const data = await confirmMenu(menuId, req.user?.id);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'confirm',
      entity: 'menus',
      entityId: menuId,
      oldValue: before,
      newValue: {
        id: data.id,
        date: data.date,
        isConfirmed: data.isConfirmed,
        confirmedAt: data.confirmedAt,
      },
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    if (error instanceof MenuStockShortageError) {
      res.status(400).json({ message: error.message, shortages: error.shortages });
      return;
    }

    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const cancelMenuConfirmationHandler = async (req: AuthRequest, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const before = await db.query.dailyMenus.findFirst({
      where: eq(dailyMenus.id, menuId),
    });
    const data = await cancelMenuConfirmation(menuId, req.user?.id);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'cancel_confirmation',
      entity: 'menus',
      entityId: menuId,
      oldValue: before,
      newValue: {
        id: data.id,
        date: data.date,
        isConfirmed: data.isConfirmed,
        confirmedAt: data.confirmedAt,
      },
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getMenuPrintHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getMenuPrintData(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: getErrorMessage(error) });
  }
};
