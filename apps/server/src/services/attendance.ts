import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { attendance, children } from '../db/schema';

export async function getAttendanceForDate(date: string, groupId?: number) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const query = db
    .select({
      childId: children.id,
      fullName: children.fullName,
      birthDate: children.birthDate,
      isPresent: attendance.isPresent,
    })
    .from(children)
    .leftJoin(
      attendance,
      and(eq(attendance.childId, children.id), eq(attendance.date, targetDate))
    );

  if (groupId) {
    return query.where(eq(children.groupId, groupId));
  }

  return query;
}

export async function saveAttendance(date: string, records: { childId: number; isPresent: boolean }[]) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  for (const record of records) {
    await db
      .delete(attendance)
      .where(and(eq(attendance.childId, record.childId), eq(attendance.date, targetDate)));

    await db.insert(attendance).values({
      childId: record.childId,
      date: targetDate,
      isPresent: record.isPresent,
    });
  }

  return { success: true };
}

export async function getAttendanceSummary(date: string) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const presentChildren = await db
    .select({
      birthDate: children.birthDate,
    })
    .from(attendance)
    .innerJoin(children, eq(children.id, attendance.childId))
    .where(and(eq(attendance.date, targetDate), eq(attendance.isPresent, true)));

  let count0_4 = 0;
  let count5_7 = 0;

  const now = new Date();

  for (const child of presentChildren) {
    const birth = new Date(child.birthDate);
    let age = now.getFullYear() - birth.getFullYear();
    const monthDelta = now.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age--;

    if (age < 5) count0_4++;
    else count5_7++;
  }

  return { count0_4, count5_7 };
}
