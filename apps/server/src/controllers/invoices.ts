import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createInvoice, deleteInvoice, getInvoiceDetails, getInvoicesOverview, postInvoice } from '../services/stock';
import { db } from '../db';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Невідома помилка';
};

export const getInvoices = async (_req: AuthRequest, res: Response) => {
  try {
    const invoices = await getInvoicesOverview();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при завантаженні накладних', error: getErrorMessage(error) });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await getInvoiceDetails(db, Number(req.params.id));
    res.json(invoice);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Накладну не знайдено' ? 404 : 400).json({ message });
  }
};

export const createInvoiceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await createInvoice({
      ...req.body,
      userId: req.user?.id,
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const postInvoiceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await postInvoice(Number(req.params.id), req.user?.id);
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const deleteInvoiceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const result = await deleteInvoice(Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
