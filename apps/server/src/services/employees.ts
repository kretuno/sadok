import { asc, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../db';
import { uploadPath } from '../paths';
import {
  childGroups,
  employeeDocuments,
  employeeHistory,
  employees,
  inventory,
  inventoryTransfers,
  users,
} from '../db/schema';

type InventoryAssignmentType = 'employee' | 'group' | 'outdoor' | 'storage';

export interface EmployeeInput {
  fullName: string;
  position: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  hireDate?: string;
  rate?: number | null;
  notes?: string;
  userId?: number | null;
}

export interface EmployeeInventoryInput {
  inventoryNumber: string;
  name: string;
  category: string;
  location?: string;
  assignmentType?: InventoryAssignmentType;
  employeeId?: number | null;
  groupId?: number | null;
  outdoorArea?: string | null;
  initialValue?: number | null;
  status?: string | null;
  arrivalDate?: string;
  notes?: string;
}

export interface EmployeeDocumentInput {
  title: string;
  documentType: string;
  documentNumber?: string;
  fileName?: string;
  originalFileName?: string;
  mimeType?: string;
  fileContentBase64?: string;
  issueDate?: string;
  notes?: string;
}

interface SavedEmployeeFile {
  fileName: string;
  originalFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

const uploadsRoot = uploadPath('employee-documents');

async function ensureEmployeeExists(employeeId: number) {
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });

  if (!employee) {
    throw new Error('Співробітника не знайдено');
  }

  return employee;
}

async function ensureGroupExists(groupId: number) {
  const group = await db.query.childGroups.findFirst({
    where: eq(childGroups.id, groupId),
  });

  if (!group) {
    throw new Error('Групу не знайдено');
  }

  return group;
}

async function addEmployeeHistoryEntry(input: {
  employeeId: number;
  eventType: string;
  title: string;
  description?: string | null;
  userId?: number | null;
}) {
  await db.insert(employeeHistory).values({
    employeeId: input.employeeId,
    eventType: input.eventType,
    title: input.title,
    description: input.description ?? null,
    userId: input.userId ?? null,
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function saveEmployeeDocumentFile(
  employeeId: number,
  input: EmployeeDocumentInput
): Promise<SavedEmployeeFile | null> {
  if (!input.fileContentBase64 || !input.originalFileName) {
    return null;
  }

  const employeeDir = path.join(uploadsRoot, String(employeeId));
  await fs.mkdir(employeeDir, { recursive: true });

  const safeOriginalName = sanitizeFileName(input.originalFileName);
  const uniqueFileName = `${Date.now()}_${safeOriginalName}`;
  const absolutePath = path.join(employeeDir, uniqueFileName);
  const buffer = Buffer.from(input.fileContentBase64, 'base64');

  await fs.writeFile(absolutePath, buffer);

  return {
    fileName: uniqueFileName,
    originalFileName: input.originalFileName,
    filePath: `/uploads/employee-documents/${employeeId}/${uniqueFileName}`,
    mimeType: input.mimeType || 'application/octet-stream',
    fileSize: buffer.length,
  };
}

async function resolveInventoryAssignment(input: {
  assignmentType?: InventoryAssignmentType;
  employeeId?: number | null;
  groupId?: number | null;
  outdoorArea?: string | null;
}) {
  const assignmentType = input.assignmentType ?? 'employee';

  if (assignmentType === 'employee') {
    if (!input.employeeId) {
      throw new Error('Для прив’язки ТМЦ до співробітника потрібно обрати співробітника');
    }

    const employee = await ensureEmployeeExists(input.employeeId);

    return {
      assignmentType,
      responsibleId: employee.id,
      groupId: null,
      outdoorArea: null,
      assignmentLabel: `Співробітник: ${employee.fullName}`,
    };
  }

  if (assignmentType === 'group') {
    if (!input.groupId) {
      throw new Error('Для прив’язки ТМЦ до групи потрібно обрати групу');
    }

    const group = await ensureGroupExists(input.groupId);

    return {
      assignmentType,
      responsibleId: null,
      groupId: group.id,
      outdoorArea: null,
      assignmentLabel: `Група: ${group.name}`,
    };
  }

  if (assignmentType === 'outdoor') {
    if (!input.outdoorArea?.trim()) {
      throw new Error('Для зовнішнього обліку потрібно вказати ділянку або зону');
    }

    return {
      assignmentType,
      responsibleId: null,
      groupId: null,
      outdoorArea: input.outdoorArea.trim(),
      assignmentLabel: `Територія: ${input.outdoorArea.trim()}`,
    };
  }

  return {
    assignmentType: 'storage' as InventoryAssignmentType,
    responsibleId: null,
    groupId: null,
    outdoorArea: null,
    assignmentLabel: 'Склад без прив’язки',
  };
}

function buildAssignmentLabel(item: {
  assignmentType?: string | null;
  responsibleName?: string | null;
  groupName?: string | null;
  outdoorArea?: string | null;
}) {
  if (item.assignmentType === 'employee') {
    return `Співробітник: ${item.responsibleName || 'не вказано'}`;
  }

  if (item.assignmentType === 'group') {
    return `Група: ${item.groupName || 'не вказано'}`;
  }

  if (item.assignmentType === 'outdoor') {
    return `Територія: ${item.outdoorArea || 'не вказано'}`;
  }

  return 'Склад без прив’язки';
}

export async function getEmployees() {
  return db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      position: employees.position,
      department: employees.department,
      phone: employees.phone,
      email: employees.email,
      address: employees.address,
      hireDate: employees.hireDate,
      rate: employees.rate,
      notes: employees.notes,
      userId: employees.userId,
      userFullName: users.fullName,
      userRole: users.role,
    })
    .from(employees)
    .leftJoin(users, eq(users.id, employees.userId))
    .orderBy(asc(employees.fullName));
}

export async function getInventoryRegistry() {
  const items = await db
    .select({
      id: inventory.id,
      inventoryNumber: inventory.inventoryNumber,
      name: inventory.name,
      category: inventory.category,
      location: inventory.location,
      assignmentType: inventory.assignmentType,
      responsibleId: inventory.responsibleId,
      responsibleName: employees.fullName,
      groupId: inventory.groupId,
      groupName: childGroups.name,
      outdoorArea: inventory.outdoorArea,
      initialValue: inventory.initialValue,
      status: inventory.status,
      arrivalDate: inventory.arrivalDate,
      notes: inventory.notes,
    })
    .from(inventory)
    .leftJoin(employees, eq(employees.id, inventory.responsibleId))
    .leftJoin(childGroups, eq(childGroups.id, inventory.groupId))
    .orderBy(asc(inventory.category), asc(inventory.name));

  return items.map((item) => ({
    ...item,
    assignmentLabel: buildAssignmentLabel(item),
  }));
}

export async function getEmployeeDetails(employeeId: number) {
  const employeeRows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      position: employees.position,
      department: employees.department,
      phone: employees.phone,
      email: employees.email,
      address: employees.address,
      hireDate: employees.hireDate,
      rate: employees.rate,
      notes: employees.notes,
      userId: employees.userId,
      userFullName: users.fullName,
      userRole: users.role,
    })
    .from(employees)
    .leftJoin(users, eq(users.id, employees.userId))
    .where(eq(employees.id, employeeId));

  const employee = employeeRows[0];

  if (!employee) {
    throw new Error('Співробітника не знайдено');
  }

  const assignedInventoryRows = await db
    .select({
      id: inventory.id,
      inventoryNumber: inventory.inventoryNumber,
      name: inventory.name,
      category: inventory.category,
      location: inventory.location,
      assignmentType: inventory.assignmentType,
      groupId: inventory.groupId,
      groupName: childGroups.name,
      outdoorArea: inventory.outdoorArea,
      initialValue: inventory.initialValue,
      status: inventory.status,
      arrivalDate: inventory.arrivalDate,
      notes: inventory.notes,
    })
    .from(inventory)
    .leftJoin(childGroups, eq(childGroups.id, inventory.groupId))
    .where(eq(inventory.responsibleId, employeeId))
    .orderBy(asc(inventory.name));

  const availableInventoryRows = await db
    .select({
      id: inventory.id,
      inventoryNumber: inventory.inventoryNumber,
      name: inventory.name,
      category: inventory.category,
      location: inventory.location,
      assignmentType: inventory.assignmentType,
      groupId: inventory.groupId,
      groupName: childGroups.name,
      outdoorArea: inventory.outdoorArea,
      initialValue: inventory.initialValue,
      status: inventory.status,
      arrivalDate: inventory.arrivalDate,
      responsibleId: inventory.responsibleId,
      notes: inventory.notes,
    })
    .from(inventory)
    .leftJoin(childGroups, eq(childGroups.id, inventory.groupId))
    .orderBy(asc(inventory.name));

  const documents = await db
    .select({
      id: employeeDocuments.id,
      title: employeeDocuments.title,
      documentType: employeeDocuments.documentType,
      documentNumber: employeeDocuments.documentNumber,
      fileName: employeeDocuments.fileName,
      originalFileName: employeeDocuments.originalFileName,
      filePath: employeeDocuments.filePath,
      mimeType: employeeDocuments.mimeType,
      fileSize: employeeDocuments.fileSize,
      issueDate: employeeDocuments.issueDate,
      notes: employeeDocuments.notes,
      createdAt: employeeDocuments.createdAt,
    })
    .from(employeeDocuments)
    .where(eq(employeeDocuments.employeeId, employeeId))
    .orderBy(asc(employeeDocuments.documentType), asc(employeeDocuments.title));

  const history = await db
    .select({
      id: employeeHistory.id,
      eventType: employeeHistory.eventType,
      title: employeeHistory.title,
      description: employeeHistory.description,
      createdAt: employeeHistory.createdAt,
      userId: employeeHistory.userId,
      userFullName: users.fullName,
    })
    .from(employeeHistory)
    .leftJoin(users, eq(users.id, employeeHistory.userId))
    .where(eq(employeeHistory.employeeId, employeeId))
    .orderBy(asc(employeeHistory.createdAt), asc(employeeHistory.id));

  const transferHistory = await db
    .select({
      id: inventoryTransfers.id,
      inventoryId: inventoryTransfers.inventoryId,
      inventoryNumber: inventory.inventoryNumber,
      inventoryName: inventory.name,
      fromEmployeeId: inventoryTransfers.fromEmployeeId,
      toEmployeeId: inventoryTransfers.toEmployeeId,
      fromEmployeeName: users.fullName,
      note: inventoryTransfers.note,
      transferredAt: inventoryTransfers.transferredAt,
    })
    .from(inventoryTransfers)
    .leftJoin(inventory, eq(inventory.id, inventoryTransfers.inventoryId))
    .leftJoin(users, eq(users.id, inventoryTransfers.transferredByUserId))
    .where(eq(inventoryTransfers.toEmployeeId, employeeId))
    .orderBy(asc(inventoryTransfers.transferredAt));

  return {
    employee,
    assignedInventory: assignedInventoryRows.map((item) => ({
      ...item,
      assignmentLabel: buildAssignmentLabel(item),
    })),
    availableInventory: availableInventoryRows.map((item) => ({
      ...item,
      assignmentLabel: buildAssignmentLabel(item),
    })),
    documents,
    history,
    transferHistory,
    inventoryRegistry: await getInventoryRegistry(),
  };
}

export async function createEmployee(input: EmployeeInput) {
  const inserted = await db
    .insert(employees)
    .values({
      fullName: input.fullName.trim(),
      position: input.position.trim(),
      department: input.department?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      hireDate: input.hireDate ? new Date(input.hireDate) : null,
      rate: input.rate ?? null,
      notes: input.notes?.trim() || null,
      userId: input.userId ?? null,
    })
    .returning();

  await addEmployeeHistoryEntry({
    employeeId: inserted[0].id,
    eventType: 'employee_created',
    title: 'Створено картку співробітника',
    description: `Створено співробітника "${inserted[0].fullName}" на посаді "${inserted[0].position}"`,
  });

  return inserted;
}

export async function updateEmployee(employeeId: number, input: EmployeeInput) {
  await ensureEmployeeExists(employeeId);

  const updated = await db
    .update(employees)
    .set({
      fullName: input.fullName.trim(),
      position: input.position.trim(),
      department: input.department?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      hireDate: input.hireDate ? new Date(input.hireDate) : null,
      rate: input.rate ?? null,
      notes: input.notes?.trim() || null,
      userId: input.userId ?? null,
    })
    .where(eq(employees.id, employeeId))
    .returning();

  await addEmployeeHistoryEntry({
    employeeId,
    eventType: 'employee_updated',
    title: 'Оновлено картку співробітника',
    description: `Оновлено дані співробітника "${updated[0].fullName}"`,
  });

  return updated;
}

export async function createInventoryItem(
  input: EmployeeInventoryInput,
  transferredByUserId?: number
) {
  if (!input.inventoryNumber?.trim()) {
    throw new Error('Інвентарний номер є обов’язковим');
  }

  if (!input.name?.trim()) {
    throw new Error('Назва ТМЦ є обов’язковою');
  }

  if (!input.category?.trim()) {
    throw new Error('Категорія ТМЦ є обов’язковою');
  }

  const existingInventory = await db.query.inventory.findFirst({
    where: eq(inventory.inventoryNumber, input.inventoryNumber.trim()),
  });

  if (existingInventory) {
    throw new Error('ТМЦ з таким інвентарним номером вже існує');
  }

  const placement = await resolveInventoryAssignment({
    assignmentType: input.assignmentType,
    employeeId: input.employeeId ?? null,
    groupId: input.groupId ?? null,
    outdoorArea: input.outdoorArea ?? null,
  });

  const inserted = await db
    .insert(inventory)
    .values({
      inventoryNumber: input.inventoryNumber.trim(),
      name: input.name.trim(),
      category: input.category.trim(),
      location: input.location?.trim() || null,
      responsibleId: placement.responsibleId,
      assignmentType: placement.assignmentType,
      groupId: placement.groupId,
      outdoorArea: placement.outdoorArea,
      initialValue: input.initialValue ?? null,
      status: input.status?.trim() || 'good',
      arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : null,
      notes: input.notes?.trim() || null,
    })
    .returning();

  await db.insert(inventoryTransfers).values({
    inventoryId: inserted[0].id,
    fromEmployeeId: null,
    toEmployeeId: placement.responsibleId,
    fromAssignmentType: null,
    toAssignmentType: placement.assignmentType,
    fromGroupId: null,
    toGroupId: placement.groupId,
    fromOutdoorArea: null,
    toOutdoorArea: placement.outdoorArea,
    note: `Первинне створення та розміщення: ${placement.assignmentLabel}`,
    transferredByUserId: transferredByUserId ?? null,
  });

  if (placement.responsibleId) {
    await addEmployeeHistoryEntry({
      employeeId: placement.responsibleId,
      eventType: 'inventory_created',
      title: 'Створено та закріплено нову ТМЦ',
      description: `Створено ТМЦ "${input.name.trim()}" з інвентарним номером "${input.inventoryNumber.trim()}"`,
      userId: transferredByUserId ?? null,
    });
  }

  return inserted[0];
}

export async function reassignInventoryItem(input: {
  inventoryId: number;
  assignmentType: InventoryAssignmentType;
  employeeId?: number | null;
  groupId?: number | null;
  outdoorArea?: string | null;
  note?: string;
  transferredByUserId?: number;
}) {
  const inventoryItem = await db.query.inventory.findFirst({
    where: eq(inventory.id, input.inventoryId),
  });

  if (!inventoryItem) {
    throw new Error('Одиницю ТМЦ не знайдено');
  }

  const placement = await resolveInventoryAssignment({
    assignmentType: input.assignmentType,
    employeeId: input.employeeId ?? null,
    groupId: input.groupId ?? null,
    outdoorArea: input.outdoorArea ?? null,
  });

  await db
    .update(inventory)
    .set({
      responsibleId: placement.responsibleId,
      assignmentType: placement.assignmentType,
      groupId: placement.groupId,
      outdoorArea: placement.outdoorArea,
    })
    .where(eq(inventory.id, input.inventoryId));

  await db.insert(inventoryTransfers).values({
    inventoryId: input.inventoryId,
    fromEmployeeId: inventoryItem.responsibleId ?? null,
    toEmployeeId: placement.responsibleId,
    fromAssignmentType: inventoryItem.assignmentType ?? null,
    toAssignmentType: placement.assignmentType,
    fromGroupId: inventoryItem.groupId ?? null,
    toGroupId: placement.groupId,
    fromOutdoorArea: inventoryItem.outdoorArea ?? null,
    toOutdoorArea: placement.outdoorArea,
    note: input.note?.trim() || `Змінено прив’язку ТМЦ: ${placement.assignmentLabel}`,
    transferredByUserId: input.transferredByUserId ?? null,
  });

  if (inventoryItem.responsibleId && inventoryItem.responsibleId !== placement.responsibleId) {
    await addEmployeeHistoryEntry({
      employeeId: inventoryItem.responsibleId,
      eventType: 'inventory_transferred_out',
      title: 'ТМЦ знято з відповідальності співробітника',
      description: `ТМЦ "${inventoryItem.name}" (${inventoryItem.inventoryNumber}) більше не закріплена за співробітником`,
      userId: input.transferredByUserId ?? null,
    });
  }

  if (placement.responsibleId) {
    await addEmployeeHistoryEntry({
      employeeId: placement.responsibleId,
      eventType: 'inventory_assigned',
      title: 'Закріплено ТМЦ',
      description: `ТМЦ "${inventoryItem.name}" (${inventoryItem.inventoryNumber}) закріплено: ${placement.assignmentLabel}`,
      userId: input.transferredByUserId ?? null,
    });
  }

  return getInventoryRegistry();
}

export async function assignInventoryToEmployee(
  employeeId: number,
  inventoryId: number,
  transferredByUserId?: number
) {
  await ensureEmployeeExists(employeeId);
  await reassignInventoryItem({
    inventoryId,
    assignmentType: 'employee',
    employeeId,
    note: 'Перепризначення відповідального співробітника',
    transferredByUserId,
  });

  return getEmployeeDetails(employeeId);
}

export async function createInventoryForEmployee(
  employeeId: number,
  input: EmployeeInventoryInput
) {
  await ensureEmployeeExists(employeeId);
  await createInventoryItem({
    ...input,
    assignmentType: 'employee',
    employeeId,
  });

  return getEmployeeDetails(employeeId);
}

export async function addEmployeeDocument(
  employeeId: number,
  input: EmployeeDocumentInput
) {
  await ensureEmployeeExists(employeeId);

  if (!input.title?.trim()) {
    throw new Error('Назва документа є обов’язковою');
  }

  if (!input.documentType?.trim()) {
    throw new Error('Тип документа є обов’язковим');
  }

  const savedFile = await saveEmployeeDocumentFile(employeeId, input);

  await db.insert(employeeDocuments).values({
    employeeId,
    title: input.title.trim(),
    documentType: input.documentType.trim(),
    documentNumber: input.documentNumber?.trim() || null,
    fileName: savedFile?.fileName ?? null,
    originalFileName: savedFile?.originalFileName ?? null,
    filePath: savedFile?.filePath ?? null,
    mimeType: savedFile?.mimeType ?? null,
    fileSize: savedFile?.fileSize ?? null,
    issueDate: input.issueDate ? new Date(input.issueDate) : null,
    notes: input.notes?.trim() || null,
  });

  await addEmployeeHistoryEntry({
    employeeId,
    eventType: 'document_added',
    title: 'Додано документ співробітника',
    description: savedFile
      ? `Додано документ "${input.title.trim()}" з файлом "${savedFile.originalFileName}"`
      : `Додано документ "${input.title.trim()}"`,
  });

  return getEmployeeDetails(employeeId);
}

export async function transferInventoryBetweenEmployees(input: {
  inventoryId: number;
  fromEmployeeId: number;
  toEmployeeId: number;
  note?: string;
  transferredByUserId?: number;
}) {
  if (input.fromEmployeeId === input.toEmployeeId) {
    throw new Error('Не можна передати ТМЦ тому самому співробітнику');
  }

  const fromEmployee = await ensureEmployeeExists(input.fromEmployeeId);
  const toEmployee = await ensureEmployeeExists(input.toEmployeeId);

  const inventoryItem = await db.query.inventory.findFirst({
    where: eq(inventory.id, input.inventoryId),
  });

  if (!inventoryItem) {
    throw new Error('Одиницю ТМЦ не знайдено');
  }

  if (inventoryItem.responsibleId !== input.fromEmployeeId) {
    throw new Error('ТМЦ не закріплена за вказаним співробітником');
  }

  await reassignInventoryItem({
    inventoryId: input.inventoryId,
    assignmentType: 'employee',
    employeeId: input.toEmployeeId,
    note: input.note?.trim() || `Передача від "${fromEmployee.fullName}" до "${toEmployee.fullName}"`,
    transferredByUserId: input.transferredByUserId,
  });

  return getEmployeeDetails(input.fromEmployeeId);
}
