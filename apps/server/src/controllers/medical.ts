import { Request, Response } from 'express';
import { logAuditEvent, getClientIp } from '../services/audit';
import { db } from '../db';
import crypto from 'crypto';
import {
  children,
  illnesses,
  vaccinations,
  medications,
  childGroups,
  childMedicalCards,
  childMedicalMeasurements,
  medicationMovements,
  childPsychologicalCards,
  users,
} from '../db/schema';
import { eq, desc, lte, or, gte, asc } from 'drizzle-orm';
import { getChildren } from '../services/children';

export const spendMedication = async (req: Request, res: Response) => {
  try {
    const { medicationId, quantity, reason, childId, date } = req.body;
    const userId = (req as any).user?.id;

    const result = await db.transaction(async (tx) => {
      const [med] = await tx.select().from(medications).where(eq(medications.id, Number(medicationId)));
      if (!med) {
        return { status: 404, message: 'Препарат не знайдено' };
      }
      
      if (med.quantity < Number(quantity)) {
        return { status: 400, message: 'Недостатньо препарату на складі' };
      }

      // 1. Зменшуємо кількість
      await tx.update(medications)
        .set({ quantity: med.quantity - Number(quantity) })
        .where(eq(medications.id, Number(medicationId)));

      // 2. Записуємо рух
      await tx.insert(medicationMovements).values({
        medicationId: Number(medicationId),
        type: 'out',
        quantity: Number(quantity),
        reason,
        childId: childId ? Number(childId) : null,
        userId,
        date: date ? new Date(date) : new Date()
      });

      return { status: 200, message: 'Списання успішне' };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ message: result.message });
    }

    await logAuditEvent({
      userId,
      actionType: 'spend',
      entity: 'medication',
      entityId: Number(medicationId),
      newValue: { quantity: Number(quantity), reason, childId: childId ? Number(childId) : null },
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Списання успішне' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка списання препарату' });
  }
};

// --- Children for Medical Cards ---
export const getMedicalChildren = async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: children.id,
        fullName: children.fullName,
        birthDate: children.birthDate,
        groupName: childGroups.name,
        status: children.status,
        qrToken: children.qrToken,
      })
      .from(children)
      .leftJoin(childGroups, eq(children.groupId, childGroups.id))
      .orderBy(asc(children.fullName));
    
    res.json(list);
  } catch (error: any) {
    const logMsg = `[${new Date().toISOString()}] ERROR in getMedicalChildren: ${error.stack}\n`;
    try {
      require('fs').appendFileSync('medical_error_debug.log', logMsg);
    } catch (e) {
      console.error('Failed to write to log file', e);
    }
    
    console.error('CRITICAL ERROR in getMedicalChildren:', error);
    res.status(500).json({ 
      message: 'Помилка завантаження списку дітей',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getChildMedicalDetails = async (req: Request, res: Response) => {
  try {
    const childId = Number(req.params.childId);
    
    const [childrenRecord] = await db.select().from(children).where(eq(children.id, childId));

    const childIllnesses = await db.query.illnesses.findMany({
      where: eq(illnesses.childId, childId),
      orderBy: [desc(illnesses.startDate)],
    });

    const childVaccinations = await db.query.vaccinations.findMany({
      where: eq(vaccinations.childId, childId),
      orderBy: [desc(vaccinations.dateGiven), desc(vaccinations.planDate)],
    });

    const [medicalCard] = await db.select().from(childMedicalCards).where(eq(childMedicalCards.childId, childId));
    const measurements = await db.query.childMedicalMeasurements.findMany({
      where: eq(childMedicalMeasurements.childId, childId),
      orderBy: [desc(childMedicalMeasurements.measuredAt), desc(childMedicalMeasurements.id)],
    });

    let currentQrToken = childrenRecord?.qrToken;

    // Автоматична генерація токена, якщо його немає
    if (!currentQrToken && childrenRecord) {
      currentQrToken = crypto.randomUUID();
      await db.update(children).set({ qrToken: currentQrToken }).where(eq(children.id, childId));
      console.log(`[QR] Авто-генерація токена для дитини ID: ${childId}`);
    }

    const [psychCard] = await db.select().from(childPsychologicalCards).where(eq(childPsychologicalCards.childId, childId));

    res.json({
      child: childrenRecord || null,
      illnesses: childIllnesses,
      vaccinations: childVaccinations,
      card: medicalCard || null,
      measurements,
      psychCard: psychCard || null,
      qrToken: currentQrToken || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження медкартки' });
  }
};

export const updateChildMedicalCard = async (req: Request, res: Response) => {
  try {
    const childId = Number(req.params.childId);
    const data = req.body;
    const userId = (req as any).user?.id;
    console.log(`[Controller] Medical Card Update for Child ${childId}:`, JSON.stringify(data));

    const [existing] = await db.select().from(childMedicalCards).where(eq(childMedicalCards.childId, childId));
    const nextHeight = (data.height !== '' && data.height !== null) ? Number(data.height) : null;
    const nextWeight = (data.weight !== '' && data.weight !== null) ? Number(data.weight) : null;

    const shouldCreateMeasurement =
      (nextHeight !== null || nextWeight !== null) &&
      (!existing ||
        Number(existing.height ?? -1) !== Number(nextHeight ?? -1) ||
        Number(existing.weight ?? -1) !== Number(nextWeight ?? -1));

    if (existing) {
      await db.update(childMedicalCards).set({
        bloodGroup: data.bloodGroup,
        rhFactor: data.rhFactor,
        healthGroup: data.healthGroup,
        physicalGroup: data.physicalGroup,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        dietaryRestrictions: data.dietaryRestrictions,
        height: nextHeight,
        weight: nextWeight,
      }).where(eq(childMedicalCards.childId, childId));
    } else {
      await db.insert(childMedicalCards).values({
        childId,
        bloodGroup: data.bloodGroup,
        rhFactor: data.rhFactor,
        healthGroup: data.healthGroup,
        physicalGroup: data.physicalGroup,
        chronicConditions: data.chronicConditions,
        allergies: data.allergies,
        dietaryRestrictions: data.dietaryRestrictions,
        height: nextHeight,
        weight: nextWeight,
      });
    }

    if (shouldCreateMeasurement) {
      await db.insert(childMedicalMeasurements).values({
        childId,
        height: nextHeight,
        weight: nextWeight,
        measuredAt: new Date(),
        notes: 'Автоматично збережено з медичної картки',
        createdByUserId: userId,
      });
    }

    await logAuditEvent({
      userId,
      actionType: 'update',
      entity: 'child_medical_card',
      entityId: childId,
      newValue: data,
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Медкартку оновлено' });
  } catch (error) {
    console.error(`[Error] Medical Card Update failed:`, error);
    res.status(500).json({ 
      message: 'Помилка оновлення медкартки',
      details: error instanceof Error ? error.stack : undefined 
    });
  }
};

export const createChildMeasurement = async (req: Request, res: Response) => {
  try {
    const childId = Number(req.params.childId);
    const userId = (req as any).user?.id;
    const height = req.body.height !== '' && req.body.height !== null && req.body.height !== undefined
      ? Number(req.body.height)
      : null;
    const weight = req.body.weight !== '' && req.body.weight !== null && req.body.weight !== undefined
      ? Number(req.body.weight)
      : null;

    if (height === null && weight === null) {
      return res.status(400).json({ message: 'Вкажіть зріст або вагу' });
    }

    const measuredAt = req.body.measuredAt ? new Date(req.body.measuredAt) : new Date();
    if (Number.isNaN(measuredAt.getTime())) {
      return res.status(400).json({ message: 'Некоректна дата вимірювання' });
    }

    const [createdMeasurement] = await db.insert(childMedicalMeasurements).values({
      childId,
      height,
      weight,
      measuredAt,
      notes: req.body.notes || 'Додано вручну',
      createdByUserId: userId,
    }).returning();

    const [existingCard] = await db.select().from(childMedicalCards).where(eq(childMedicalCards.childId, childId));
    const nextHeight = height ?? existingCard?.height ?? null;
    const nextWeight = weight ?? existingCard?.weight ?? null;

    if (existingCard) {
      await db.update(childMedicalCards).set({
        height: nextHeight,
        weight: nextWeight,
      }).where(eq(childMedicalCards.childId, childId));
    } else {
      await db.insert(childMedicalCards).values({
        childId,
        height: nextHeight,
        weight: nextWeight,
      });
    }

    res.status(201).json(createdMeasurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка додавання антропометрії' });
  }
};

// --- Illnesses ---
export const getIllnesses = async (req: Request, res: Response) => {
  try {
    const records = await db
      .select({
        id: illnesses.id,
        childId: illnesses.childId,
        childName: children.fullName,
        diagnosis: illnesses.diagnosis,
        startDate: illnesses.startDate,
        endDate: illnesses.endDate,
        quarantineEndDate: illnesses.quarantineEndDate,
        isolationWard: illnesses.isolationWard,
        notes: illnesses.notes,
      })
      .from(illnesses)
      .leftJoin(children, eq(illnesses.childId, children.id))
      .orderBy(desc(illnesses.startDate));
      
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження хвороб' });
  }
};

export const createIllness = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [newItem] = await db.insert(illnesses).values({
      childId: Number(data.childId),
      diagnosis: data.diagnosis,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      quarantineEndDate: data.quarantineEndDate ? new Date(data.quarantineEndDate) : null,
      isolationWard: Boolean(data.isolationWard),
      notes: data.notes,
    }).returning();
    const userId = (req as any).user?.id;
    await logAuditEvent({
      userId,
      actionType: 'create',
      entity: 'illness',
      entityId: newItem.id,
      newValue: data,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка додавання запису' });
  }
};

export const updateIllness = async (req: Request, res: Response) => {
  try {
    const illnessId = Number(req.params.id);
    const data = req.body;

    const [updatedItem] = await db.update(illnesses).set({
      childId: Number(data.childId),
      diagnosis: data.diagnosis,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      quarantineEndDate: data.quarantineEndDate ? new Date(data.quarantineEndDate) : null,
      isolationWard: Boolean(data.isolationWard),
      notes: data.notes,
    }).where(eq(illnesses.id, illnessId)).returning();

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка оновлення запису про хворобу' });
  }
};

// --- Vaccinations ---
export const getVaccinations = async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: vaccinations.id,
        childId: vaccinations.childId,
        childName: children.fullName,
        vaccineName: vaccinations.vaccineName,
        status: vaccinations.status,
        planDate: vaccinations.planDate,
        dateGiven: vaccinations.dateGiven,
        notes: vaccinations.notes,
      })
      .from(vaccinations)
      .leftJoin(children, eq(vaccinations.childId, children.id))
      .orderBy(desc(vaccinations.planDate), desc(vaccinations.dateGiven));
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження щеплень' });
  }
};

export const createVaccination = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [newItem] = await db.insert(vaccinations).values({
      childId: Number(data.childId),
      vaccineName: data.vaccineName,
      status: data.status,
      planDate: data.planDate ? new Date(data.planDate) : null,
      dateGiven: data.dateGiven ? new Date(data.dateGiven) : null,
      notes: data.notes,
    }).returning();
    const userId = (req as any).user?.id;
    await logAuditEvent({
      userId,
      actionType: 'create',
      entity: 'vaccination',
      entityId: newItem.id,
      newValue: data,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка додавання щеплення' });
  }
};

export const updateVaccination = async (req: Request, res: Response) => {
  try {
    const vaccinationId = Number(req.params.id);
    const data = req.body;

    const [updatedItem] = await db.update(vaccinations).set({
      childId: Number(data.childId),
      vaccineName: data.vaccineName,
      status: data.status,
      planDate: data.planDate ? new Date(data.planDate) : null,
      dateGiven: data.dateGiven ? new Date(data.dateGiven) : null,
      notes: data.notes,
    }).where(eq(vaccinations.id, vaccinationId)).returning();

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка оновлення щеплення' });
  }
};

// --- Medications ---
export const getMedications = async (req: Request, res: Response) => {
  try {
    const list = await db.query.medications.findMany({
      orderBy: (m, { asc }) => [asc(m.expiryDate)],
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження медикаментів' });
  }
};

export const getMedicationMovements = async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: medicationMovements.id,
        medicationId: medicationMovements.medicationId,
        medicationName: medications.name,
        type: medicationMovements.type,
        quantity: medicationMovements.quantity,
        date: medicationMovements.date,
        reason: medicationMovements.reason,
        childId: medicationMovements.childId,
        childName: children.fullName,
        userId: medicationMovements.userId,
        userName: users.fullName,
      })
      .from(medicationMovements)
      .leftJoin(medications, eq(medicationMovements.medicationId, medications.id))
      .leftJoin(children, eq(medicationMovements.childId, children.id))
      .leftJoin(users, eq(medicationMovements.userId, users.id))
      .orderBy(desc(medicationMovements.date), desc(medicationMovements.id));

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження руху медикаментів' });
  }
};

export const createMedication = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const quantity = Number(data.quantity);
    const userId = (req as any).user?.id;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Кількість повинна бути більшою за 0' });
    }

    const [newItem] = await db.transaction(async (tx) => {
      const [insertedMedication] = await tx.insert(medications).values({
        name: data.name,
        quantity,
        unit: data.unit,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes,
      }).returning();

      await tx.insert(medicationMovements).values({
        medicationId: insertedMedication.id,
        type: 'in',
        quantity,
        reason: 'Початкове надходження препарату',
        userId,
        date: new Date(),
      });

      return [insertedMedication];
    });
    await logAuditEvent({
      userId,
      actionType: 'create',
      entity: 'medication',
      entityId: newItem.id,
      newValue: data,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка додавання препарату' });
  }
};
