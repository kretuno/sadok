import { Request, Response } from 'express';
import { archiveSupplier, createSupplier, getSuppliersOverview, updateSupplier } from '../services/stock';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Невідома помилка';
};

export const getSuppliers = async (_req: Request, res: Response) => {
  try {
    const data = await getSuppliersOverview();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при завантаженні постачальників', error: getErrorMessage(error) });
  }
};

export const createSupplierHandler = async (req: Request, res: Response) => {
  try {
    const supplier = await createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateSupplierHandler = async (req: Request, res: Response) => {
  try {
    const supplier = await updateSupplier(Number(req.params.id), req.body);
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const archiveSupplierHandler = async (req: Request, res: Response) => {
  try {
    const result = await archiveSupplier(Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
