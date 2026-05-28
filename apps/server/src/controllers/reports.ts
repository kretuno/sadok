import { Request, Response } from 'express';
import { db } from '../db';
import {
  products,
  stockMovements,
  inventory,
  employees,
  medications,
  dailyMenus,
  children,
  childGroups,
  illnesses,
  psychologicalConsultations,
  attendance,
  medicationMovements,
  menuItemRecipes,
  recipes,
  utilityMeters,
  utilityMeterReadings,
  utilityTariffs,
} from '../db/schema';
import { eq, and, gte, lte, asc, desc, sql, inArray } from 'drizzle-orm';
import { getAuditReportEntries } from '../services/audit';

// Допоміжна функція для безпечного парсингу дат
const parseDates = (start?: any, end?: any) => {
  const startDate = start ? new Date(start as string) : new Date(0);
  const endDate = end ? new Date(end as string) : new Date();
  
  if (start) startDate.setHours(0, 0, 0, 0);
  if (end) endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

export const getInventorySaldo = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    // Отримуємо всі продукти
    const allProducts = await db.select().from(products);
    
    // Отримуємо всі рухи до кінця періоду
    const allMovements = await db.select().from(stockMovements)
      .where(lte(stockMovements.date, endDate))
      .orderBy(asc(stockMovements.date));

    const report = allProducts.map(product => {
      const pMovements = allMovements.filter(m => m.productId === product.id);
      
      let startStock = 0;
      let incoming = 0;
      let outgoing = 0;
      
      pMovements.forEach(m => {
        const mDate = new Date(m.date!);
        if (mDate < startDate) {
          // Рухи до початку періоду формують вхідний залишок
          if (m.type === 'in') startStock += m.quantity;
          else if (m.type === 'out') startStock -= m.quantity;
          else if (m.type === 'adjust') startStock += m.quantity;
        } else {
          // Рухи в рамках періоду
          if (m.type === 'in') {
            incoming += m.quantity;
          } else if (m.type === 'out') {
            outgoing += m.quantity;
          } else if (m.type === 'adjust') {
            if (m.quantity > 0) incoming += m.quantity;
            else outgoing += Math.abs(m.quantity);
          }
        }
      });
      
      const endStock = startStock + incoming - outgoing;

      return {
        id: product.id,
        name: product.name,
        unit: product.unit,
        startStock: Number(startStock.toFixed(2)),
        incoming: Number(incoming.toFixed(2)),
        outgoing: Number(outgoing.toFixed(2)),
        endStock: Number(endStock.toFixed(2)),
      };
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating inventory saldo report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

export const getMedicationsReport = async (req: Request, res: Response) => {
  try {
    const allMeds = await db.select().from(medications);
    res.json(allMeds);
  } catch (error) {
    console.error('Error generating medications report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

export const getTmcReport = async (req: Request, res: Response) => {
  try {
    const records = await db.select({
      id: inventory.id,
      name: inventory.name,
      inventoryNumber: inventory.inventoryNumber,
      category: inventory.category,
      location: inventory.location,
      assignmentType: inventory.assignmentType,
      groupName: childGroups.name,
      outdoorArea: inventory.outdoorArea,
      status: inventory.status,
      initialValue: inventory.initialValue,
      arrivalDate: inventory.arrivalDate,
      employeeName: employees.fullName,
    })
    .from(inventory)
    .leftJoin(employees, eq(inventory.responsibleId, employees.id))
    .leftJoin(childGroups, eq(inventory.groupId, childGroups.id));

    res.json(records);
  } catch (error) {
    console.error('Error generating TMC report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

export const getMenusReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const menus = await db.select().from(dailyMenus)
      .where(
        and(
          gte(dailyMenus.date, startDate),
          lte(dailyMenus.date, endDate)
        )
      )
      .orderBy(desc(dailyMenus.date));

    res.json(menus.map(m => ({
      id: m.id,
      date: m.date,
      count0_4: m.childrenCount0_4,
      count5_7: m.childrenCount5_7,
      childrenTotal: m.childrenCount0_4 + m.childrenCount5_7,
      status: m.isConfirmed ? 'Затверджено' : 'Чернетка',
    })));
  } catch (error) {
    console.error('Error generating menus report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

// -- НОВІ ЗВІТИ --

export const getChildrenReport = async (req: Request, res: Response) => {
  try {
    const list = await db.select({
      id: children.id,
      fullName: children.fullName,
      birthDate: children.birthDate,
      groupName: childGroups.name,
      status: children.status
    })
    .from(children)
    .leftJoin(childGroups, eq(children.groupId, childGroups.id))
    .orderBy(asc(children.fullName));
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getSickChildrenReport = async (req: Request, res: Response) => {
  try {
    const list = await db.select({
      id: illnesses.id,
      childName: children.fullName,
      diagnosis: illnesses.diagnosis,
      startDate: illnesses.startDate,
      endDate: illnesses.endDate,
      isolation: illnesses.isolationWard
    })
    .from(illnesses)
    .innerJoin(children, eq(illnesses.childId, children.id))
    .where(sql`${illnesses.endDate} IS NULL OR ${illnesses.endDate} >= CURRENT_DATE`)
    .orderBy(desc(illnesses.startDate));
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getPsychologyReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const consultations = await db.select({
      id: psychologicalConsultations.id,
      childName: children.fullName,
      type: psychologicalConsultations.consultationType,
      topic: psychologicalConsultations.topic,
      date: psychologicalConsultations.date,
      notes: psychologicalConsultations.notes
    })
    .from(psychologicalConsultations)
    .leftJoin(children, eq(psychologicalConsultations.childId, children.id))
    .where(and(
      gte(psychologicalConsultations.date, startDate),
      lte(psychologicalConsultations.date, endDate)
    ))
    .orderBy(desc(psychologicalConsultations.date));

    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const attData = await db.select({
      childId: attendance.childId,
      childName: children.fullName,
      isPresent: attendance.isPresent,
    })
    .from(attendance)
    .innerJoin(children, eq(attendance.childId, children.id))
    .where(and(
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ));

    // Агрегуємо на стороні JS
    const stats: Record<number, any> = {};
    attData.forEach(row => {
      if (!stats[row.childId]) {
        stats[row.childId] = { name: row.childName, present: 0, absent: 0, total: 0 };
      }
      stats[row.childId].total++;
      if (row.isPresent) stats[row.childId].present++;
      else stats[row.childId].absent++;
    });

    res.json(Object.values(stats));
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getSpentProductsReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const spent = await db.select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      totalQuantity: sql<number>`SUM(${stockMovements.quantity})`,
      totalCost: sql<number>`SUM(${stockMovements.quantity} * ${stockMovements.priceAtMoment})`
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(and(
      eq(stockMovements.type, 'out'),
      gte(stockMovements.date, startDate),
      lte(stockMovements.date, endDate)
    ))
    .groupBy(products.id);

    res.json(spent);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getSpentMedicationsReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const spent = await db.select({
      id: medicationMovements.id,
      medName: medications.name,
      quantity: medicationMovements.quantity,
      unit: medications.unit,
      date: medicationMovements.date,
      reason: medicationMovements.reason,
      childName: children.fullName
    })
    .from(medicationMovements)
    .innerJoin(medications, eq(medicationMovements.medicationId, medications.id))
    .leftJoin(children, eq(medicationMovements.childId, children.id))
    .where(and(
      eq(medicationMovements.type, 'out'),
      gte(medicationMovements.date, startDate),
      lte(medicationMovements.date, endDate)
    ))
    .orderBy(desc(medicationMovements.date));

    res.json(spent);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getDetailedMenusReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const data = await db.select({
      id: dailyMenus.id,
      date: dailyMenus.date,
      mealType: menuItemRecipes.mealType,
      dishName: recipes.name,
      count0_4: dailyMenus.childrenCount0_4,
      count5_7: dailyMenus.childrenCount5_7
    })
    .from(dailyMenus)
    .innerJoin(menuItemRecipes, eq(dailyMenus.id, menuItemRecipes.menuId))
    .innerJoin(recipes, eq(menuItemRecipes.recipeId, recipes.id))
    .where(and(
      gte(dailyMenus.date, startDate),
      lte(dailyMenus.date, endDate)
    ))
    .orderBy(desc(dailyMenus.date), asc(menuItemRecipes.mealType));

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const getUtilitiesReport = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const meters = await db.select().from(utilityMeters).orderBy(asc(utilityMeters.utilityType), asc(utilityMeters.name));
    const readings = await db.select().from(utilityMeterReadings).orderBy(asc(utilityMeterReadings.readingDate), asc(utilityMeterReadings.id));
    const tariffs = await db.select().from(utilityTariffs).orderBy(desc(utilityTariffs.validFrom), desc(utilityTariffs.id));

    const report = meters.map((meter) => {
      const meterReadings = readings
        .filter((reading) => reading.meterId === meter.id)
        .sort((a, b) => {
          const dateDiff = new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime();
          return dateDiff !== 0 ? dateDiff : a.id - b.id;
        });

      const startReading =
        [...meterReadings]
          .reverse()
          .find((reading) => new Date(reading.readingDate).getTime() <= startDate.getTime()) || null;

      const periodReadings = meterReadings.filter((reading) => {
        const readingTime = new Date(reading.readingDate).getTime();
        return readingTime >= startDate.getTime() && readingTime <= endDate.getTime();
      });

      const endReading = periodReadings[periodReadings.length - 1] || startReading || null;
      const effectiveStartReading = startReading || meterReadings[0] || null;
      const consumption =
        effectiveStartReading && endReading
          ? Number((endReading.readingValue - effectiveStartReading.readingValue).toFixed(3))
          : 0;

      const currentTariff =
        tariffs.find((tariff) =>
          tariff.meterId === meter.id && new Date(tariff.validFrom).getTime() <= endDate.getTime()
        ) || null;

      const estimatedCost = currentTariff
        ? Number((consumption * currentTariff.pricePerUnit + currentTariff.fixedFee).toFixed(2))
        : 0;

      return {
        id: meter.id,
        meterName: meter.name,
        utilityType: meter.utilityType,
        unit: meter.unit,
        location: meter.location,
        accountNumber: meter.accountNumber,
        startReading: effectiveStartReading?.readingValue ?? null,
        endReading: endReading?.readingValue ?? null,
        startReadingDate: effectiveStartReading?.readingDate ?? null,
        endReadingDate: endReading?.readingDate ?? null,
        readingsCount: periodReadings.length,
        consumption,
        tariffPrice: currentTariff?.pricePerUnit ?? null,
        fixedFee: currentTariff?.fixedFee ?? null,
        estimatedCost,
      };
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating utilities report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

export const getAuditReport = async (req: Request, res: Response) => {
  try {
    const { start, end, userId, entity, actionType, limit } = req.query;
    const { startDate, endDate } = parseDates(start, end);

    const data = await getAuditReportEntries({
      start: start ? startDate : undefined,
      end: end ? endDate : undefined,
      userId: userId ? Number(userId) : undefined,
      entity: typeof entity === 'string' && entity.trim() ? entity : undefined,
      actionType: typeof actionType === 'string' && actionType.trim() ? actionType : undefined,
      limit: limit ? Number(limit) : 300,
    });

    res.json(
      data.map((row) => ({
        ...row,
        oldValue: row.oldValue ? safeParseAuditJson(row.oldValue) : null,
        newValue: row.newValue ? safeParseAuditJson(row.newValue) : null,
      }))
    );
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

const safeParseAuditJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
