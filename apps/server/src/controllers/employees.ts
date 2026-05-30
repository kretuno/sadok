import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  addEmployeeDocument,
  assignInventoryToEmployee,
  createInventoryItem,
  createEmployee,
  createInventoryForEmployee,
  getEmployeeDetails,
  getEmployees,
  getInventoryRegistry,
  reassignInventoryItem,
  transferInventoryBetweenEmployees,
  updateEmployee,
} from '../services/employees';
import { logAuditEvent, getClientIp } from '../services/audit';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
};

export const getEmployeesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getEmployees();
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getEmployeeDetailsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getEmployeeDetails(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getInventoryRegistryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getInventoryRegistry();
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const createEmployeeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createEmployee(req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'create',
      entity: 'employee',
      entityId: data[0]?.id,
      newValue: req.body,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateEmployeeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await updateEmployee(Number(req.params.id), req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'update',
      entity: 'employee',
      entityId: Number(req.params.id),
      newValue: req.body,
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const assignInventoryToEmployeeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await assignInventoryToEmployee(
      Number(req.params.id),
      Number(req.body.inventoryId),
      req.user?.id
    );
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const createInventoryForEmployeeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createInventoryForEmployee(Number(req.params.id), req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const createInventoryItemHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createInventoryItem(req.body, req.user?.id);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'create',
      entity: 'inventory_item',
      entityId: data.id,
      newValue: req.body,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const reassignInventoryItemHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await reassignInventoryItem({
      inventoryId: Number(req.body.inventoryId),
      assignmentType: req.body.assignmentType,
      employeeId: req.body.employeeId ? Number(req.body.employeeId) : null,
      groupId: req.body.groupId ? Number(req.body.groupId) : null,
      outdoorArea: req.body.outdoorArea,
      note: req.body.note,
      transferredByUserId: req.user?.id,
    });

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'reassign',
      entity: 'inventory_item',
      entityId: Number(req.body.inventoryId),
      newValue: req.body,
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const addEmployeeDocumentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await addEmployeeDocument(Number(req.params.id), req.body);

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'create',
      entity: 'employee_document',
      entityId: Number(req.params.id),
      newValue: { title: req.body.title, documentType: req.body.documentType },
      ipAddress: getClientIp(req),
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const transferInventoryBetweenEmployeesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await transferInventoryBetweenEmployees({
      inventoryId: Number(req.body.inventoryId),
      fromEmployeeId: Number(req.params.id),
      toEmployeeId: Number(req.body.toEmployeeId),
      note: req.body.note,
      transferredByUserId: req.user?.id,
    });

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'transfer',
      entity: 'inventory_item',
      entityId: Number(req.body.inventoryId),
      newValue: { fromEmployeeId: Number(req.params.id), toEmployeeId: Number(req.body.toEmployeeId), note: req.body.note },
      ipAddress: getClientIp(req),
    });

    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
