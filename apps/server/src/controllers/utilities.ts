import { Request, Response } from 'express';
import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from '../db';
import { utilityMeterReadings, utilityMeters, utilityTariffs } from '../db/schema';
import { logAuditEvent, getClientIp } from '../services/audit';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
};

const getLatestReadingByMeterId = async (meterId: number) => {
  const [latestReading] = await db
    .select()
    .from(utilityMeterReadings)
    .where(eq(utilityMeterReadings.meterId, meterId))
    .orderBy(desc(utilityMeterReadings.readingDate), desc(utilityMeterReadings.id))
    .limit(1);

  return latestReading || null;
};

const getPreviousReadingByMeterId = async (meterId: number, currentReadingId?: number) => {
  const readings = await db
    .select()
    .from(utilityMeterReadings)
    .where(eq(utilityMeterReadings.meterId, meterId))
    .orderBy(desc(utilityMeterReadings.readingDate), desc(utilityMeterReadings.id));

  if (!currentReadingId) {
    return readings[1] || null;
  }

  const index = readings.findIndex((reading) => reading.id === currentReadingId);
  if (index < 0) return null;
  return readings[index + 1] || null;
};

const getCurrentTariffByMeterId = async (meterId: number, date: Date = new Date()) => {
  const [tariff] = await db
    .select()
    .from(utilityTariffs)
    .where(and(eq(utilityTariffs.meterId, meterId), lte(utilityTariffs.validFrom, date)))
    .orderBy(desc(utilityTariffs.validFrom), desc(utilityTariffs.id))
    .limit(1);

  return tariff || null;
};

export const getMeters = async (_req: Request, res: Response) => {
  try {
    const meters = await db
      .select()
      .from(utilityMeters)
      .orderBy(asc(utilityMeters.utilityType), asc(utilityMeters.name));

    const enrichedMeters = await Promise.all(
      meters.map(async (meter) => {
        const latestReading = await getLatestReadingByMeterId(meter.id);
        const previousReading = latestReading ? await getPreviousReadingByMeterId(meter.id, latestReading.id) : null;
        const currentTariff = await getCurrentTariffByMeterId(meter.id);
        const consumption = latestReading && previousReading
          ? Number((latestReading.readingValue - previousReading.readingValue).toFixed(3))
          : null;
        const estimatedCost =
          consumption !== null && currentTariff
            ? Number((consumption * currentTariff.pricePerUnit + currentTariff.fixedFee).toFixed(2))
            : null;

        return {
          ...meter,
          latestReading,
          previousReading,
          currentTariff,
          lastConsumption: consumption,
          estimatedCost,
        };
      })
    );

    res.json(enrichedMeters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження лічильників' });
  }
};

export const createMeter = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const [createdMeter] = await db.insert(utilityMeters).values({
      name: payload.name,
      utilityType: payload.utilityType,
      unit: payload.unit,
      location: payload.location || null,
      accountNumber: payload.accountNumber || null,
      notes: payload.notes || null,
      isActive: payload.isActive !== false,
    }).returning();

    await logAuditEvent({
      userId: (req as any).user?.id,
      actionType: 'create',
      entity: 'utility_meter',
      entityId: createdMeter.id,
      newValue: payload,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(createdMeter);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateMeter = async (req: Request, res: Response) => {
  try {
    const meterId = Number(req.params.id);
    const payload = req.body;
    const [updatedMeter] = await db.update(utilityMeters).set({
      name: payload.name,
      utilityType: payload.utilityType,
      unit: payload.unit,
      location: payload.location || null,
      accountNumber: payload.accountNumber || null,
      notes: payload.notes || null,
      isActive: payload.isActive !== false,
    }).where(eq(utilityMeters.id, meterId)).returning();

    await logAuditEvent({
      userId: (req as any).user?.id,
      actionType: 'update',
      entity: 'utility_meter',
      entityId: meterId,
      newValue: payload,
      ipAddress: getClientIp(req),
    });

    res.json(updatedMeter);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getReadings = async (req: Request, res: Response) => {
  try {
    const meterId = req.query.meterId ? Number(req.query.meterId) : null;
    const readings = await db
      .select({
        id: utilityMeterReadings.id,
        meterId: utilityMeterReadings.meterId,
        meterName: utilityMeters.name,
        utilityType: utilityMeters.utilityType,
        unit: utilityMeters.unit,
        readingValue: utilityMeterReadings.readingValue,
        readingDate: utilityMeterReadings.readingDate,
        notes: utilityMeterReadings.notes,
        createdAt: utilityMeterReadings.createdAt,
      })
      .from(utilityMeterReadings)
      .innerJoin(utilityMeters, eq(utilityMeterReadings.meterId, utilityMeters.id))
      .where(meterId ? eq(utilityMeterReadings.meterId, meterId) : undefined)
      .orderBy(desc(utilityMeterReadings.readingDate), desc(utilityMeterReadings.id));

    res.json(readings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження показань' });
  }
};

export const createReading = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const meterId = Number(payload.meterId);
    const readingValue = Number(payload.readingValue);
    const readingDate = new Date(payload.readingDate);
    const userId = (req as any).user?.id;

    if (!Number.isFinite(readingValue) || readingValue < 0) {
      return res.status(400).json({ message: 'Показник має бути невід’ємним числом' });
    }

    if (Number.isNaN(readingDate.getTime())) {
      return res.status(400).json({ message: 'Некоректна дата показання' });
    }

    const latestReading = await getLatestReadingByMeterId(meterId);
    if (latestReading && readingValue < latestReading.readingValue) {
      return res.status(400).json({ message: 'Нове показання не може бути меншим за попереднє' });
    }

    const [createdReading] = await db.insert(utilityMeterReadings).values({
      meterId,
      readingValue,
      readingDate,
      notes: payload.notes || null,
      createdByUserId: userId,
    }).returning();

    await logAuditEvent({
      userId,
      actionType: 'create',
      entity: 'utility_meter_reading',
      entityId: createdReading.id,
      newValue: { meterId, readingValue, readingDate, notes: payload.notes },
      ipAddress: getClientIp(req),
    });

    res.status(201).json(createdReading);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getTariffs = async (req: Request, res: Response) => {
  try {
    const meterId = req.query.meterId ? Number(req.query.meterId) : null;
    const tariffs = await db
      .select({
        id: utilityTariffs.id,
        meterId: utilityTariffs.meterId,
        meterName: utilityMeters.name,
        utilityType: utilityMeters.utilityType,
        unit: utilityMeters.unit,
        pricePerUnit: utilityTariffs.pricePerUnit,
        fixedFee: utilityTariffs.fixedFee,
        validFrom: utilityTariffs.validFrom,
        notes: utilityTariffs.notes,
      })
      .from(utilityTariffs)
      .innerJoin(utilityMeters, eq(utilityTariffs.meterId, utilityMeters.id))
      .where(meterId ? eq(utilityTariffs.meterId, meterId) : undefined)
      .orderBy(desc(utilityTariffs.validFrom), desc(utilityTariffs.id));

    res.json(tariffs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Помилка завантаження тарифів' });
  }
};

export const createTariff = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const [createdTariff] = await db.insert(utilityTariffs).values({
      meterId: Number(payload.meterId),
      pricePerUnit: Number(payload.pricePerUnit),
      fixedFee: Number(payload.fixedFee || 0),
      validFrom: new Date(payload.validFrom),
      notes: payload.notes || null,
    }).returning();

    await logAuditEvent({
      userId: (req as any).user?.id,
      actionType: 'create',
      entity: 'utility_tariff',
      entityId: createdTariff.id,
      newValue: payload,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(createdTariff);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateTariff = async (req: Request, res: Response) => {
  try {
    const tariffId = Number(req.params.id);
    const payload = req.body;
    const [updatedTariff] = await db.update(utilityTariffs).set({
      meterId: Number(payload.meterId),
      pricePerUnit: Number(payload.pricePerUnit),
      fixedFee: Number(payload.fixedFee || 0),
      validFrom: new Date(payload.validFrom),
      notes: payload.notes || null,
    }).where(eq(utilityTariffs.id, tariffId)).returning();

    await logAuditEvent({
      userId: (req as any).user?.id,
      actionType: 'update',
      entity: 'utility_tariff',
      entityId: tariffId,
      newValue: payload,
      ipAddress: getClientIp(req),
    });

    res.json(updatedTariff);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
