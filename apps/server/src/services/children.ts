import { asc, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db';
import { childGroups, children, employees } from '../db/schema';

export async function getGroups() {
  const groups = await db.select().from(childGroups).orderBy(asc(childGroups.name));
  const staff = await db.select({
    id: employees.id,
    fullName: employees.fullName,
  }).from(employees);

  return groups.map((group) => ({
    ...group,
    primaryEducatorName: group.primaryEducatorId
      ? staff.find((employee) => employee.id === group.primaryEducatorId)?.fullName ?? null
      : null,
    assistantEducatorName: group.assistantEducatorId
      ? staff.find((employee) => employee.id === group.assistantEducatorId)?.fullName ?? null
      : null,
  }));
}

export async function createGroup(input: {
  name: string;
  primaryEducatorId?: number | null;
  assistantEducatorId?: number | null;
}) {
  return db.insert(childGroups).values({
    name: input.name,
    primaryEducatorId: input.primaryEducatorId ?? null,
    assistantEducatorId: input.assistantEducatorId ?? null,
  }).returning();
}

export async function updateGroup(groupId: number, input: {
  name: string;
  primaryEducatorId?: number | null;
  assistantEducatorId?: number | null;
}) {
  return db.update(childGroups).set({
    name: input.name,
    primaryEducatorId: input.primaryEducatorId ?? null,
    assistantEducatorId: input.assistantEducatorId ?? null,
  }).where(eq(childGroups.id, groupId)).returning();
}

export async function getGroupDetails(groupId: number) {
  const group = await db.query.childGroups.findFirst({
    where: eq(childGroups.id, groupId),
  });

  if (!group) throw new Error('Групу не знайдено');

  const members = await db
    .select()
    .from(children)
    .where(eq(children.groupId, groupId))
    .orderBy(asc(children.fullName));

  const primaryEducator = group.primaryEducatorId
    ? await db.query.employees.findFirst({ where: eq(employees.id, group.primaryEducatorId) })
    : null;
  const assistantEducator = group.assistantEducatorId
    ? await db.query.employees.findFirst({ where: eq(employees.id, group.assistantEducatorId) })
    : null;

  return {
    ...group,
    primaryEducatorName: primaryEducator?.fullName ?? null,
    assistantEducatorName: assistantEducator?.fullName ?? null,
    members,
  };
}

export async function getChildren() {
  return db
    .select({
      id: children.id,
      fullName: children.fullName,
      birthDate: children.birthDate,
      groupId: children.groupId,
      groupName: childGroups.name,
      status: children.status,
      qrToken: children.qrToken,
      gender: children.gender,
      address: children.address,
      documentInfo: children.documentInfo,
      motherName: children.motherName,
      motherPhone: children.motherPhone,
      fatherName: children.fatherName,
      fatherPhone: children.fatherPhone,
      hasBenefits: children.hasBenefits,
      benefitDescription: children.benefitDescription,
      photoPath: children.photoPath,
      enrollmentDate: children.enrollmentDate,
      notes: children.notes,
    })
    .from(children)
    .leftJoin(childGroups, eq(childGroups.id, children.groupId))
    .orderBy(asc(children.fullName));
}

export async function createChild(input: {
  fullName: string;
  birthDate: string;
  groupId?: number;
  gender?: string;
  address?: string;
  documentInfo?: string;
  motherName?: string;
  motherPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  hasBenefits?: boolean;
  benefitDescription?: string;
  photoPath?: string;
  enrollmentDate?: string;
  notes?: string;
}) {
  return db
    .insert(children)
    .values({
      fullName: input.fullName,
      birthDate: new Date(input.birthDate),
      groupId: input.groupId,
      qrToken: crypto.randomUUID(),
      gender: input.gender,
      address: input.address,
      documentInfo: input.documentInfo,
      motherName: input.motherName,
      motherPhone: input.motherPhone,
      fatherName: input.fatherName,
      fatherPhone: input.fatherPhone,
      hasBenefits: input.hasBenefits ?? false,
      benefitDescription: input.benefitDescription,
      photoPath: input.photoPath,
      enrollmentDate: input.enrollmentDate ? new Date(input.enrollmentDate) : null,
      notes: input.notes,
    })
    .returning();
}

export async function updateChild(childId: number, input: Partial<{
  fullName: string;
  birthDate: string;
  groupId: number;
  gender: string;
  address: string;
  documentInfo: string;
  motherName: string;
  motherPhone: string;
  fatherName: string;
  fatherPhone: string;
  hasBenefits: boolean;
  benefitDescription: string;
  photoPath: string | null;
  enrollmentDate: string | null;
  notes: string;
}>) {
  // Strict field mapping to avoid raw input spread
  const updateData: any = {};
  
  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.gender !== undefined) updateData.gender = input.gender;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.documentInfo !== undefined) updateData.documentInfo = input.documentInfo;
  if (input.motherName !== undefined) updateData.motherName = input.motherName;
  if (input.motherPhone !== undefined) updateData.motherPhone = input.motherPhone;
  if (input.fatherName !== undefined) updateData.fatherName = input.fatherName;
  if (input.fatherPhone !== undefined) updateData.fatherPhone = input.fatherPhone;
  if (input.hasBenefits !== undefined) updateData.hasBenefits = Boolean(input.hasBenefits);
  if (input.benefitDescription !== undefined) updateData.benefitDescription = input.benefitDescription;
  if (input.photoPath !== undefined) updateData.photoPath = input.photoPath;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.groupId !== undefined) updateData.groupId = Number(input.groupId);
  
  if (input.birthDate) {
    const d = new Date(input.birthDate);
    if (!isNaN(d.getTime())) {
      updateData.birthDate = d;
    }
  }

  if (input.enrollmentDate !== undefined) {
    if (!input.enrollmentDate || input.enrollmentDate === '') {
      updateData.enrollmentDate = null;
    } else {
      const d = new Date(input.enrollmentDate);
      if (!isNaN(d.getTime())) {
        updateData.enrollmentDate = d;
      } else {
        updateData.enrollmentDate = null;
      }
    }
  }

  console.log(`[Service] Updating child ${childId} with data:`, JSON.stringify(updateData));

  return db
    .update(children)
    .set(updateData)
    .where(eq(children.id, childId))
    .returning();
}

export async function regenerateQRToken(childId: number) {
  return db
    .update(children)
    .set({ qrToken: crypto.randomUUID() })
    .where(eq(children.id, childId))
    .returning();
}

export async function archiveChild(childId: number, reason: string) {
  return db
    .update(children)
    .set({ status: `archived:${reason}` })
    .where(eq(children.id, childId))
    .returning();
}

/**
 * Розраховує кількість дітей по вікових групах (на базі дати народження)
 */
export async function getChildrenCountByAge() {
  const allChildren = await db.select().from(children).where(eq(children.status, 'active'));
  
  let count0_4 = 0;
  let count5_7 = 0;

  const now = new Date();
  
  for (const child of allChildren) {
    const birth = new Date(child.birthDate);
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }

    if (age < 5) count0_4++;
    else count5_7++;
  }

  return { count0_4, count5_7 };
}
