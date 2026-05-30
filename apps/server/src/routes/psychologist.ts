import express from 'express';
import { db } from '../db';
import {
  childPsychologicalCards,
  psychologicalConsultations,
  childInclusiveCards,
  children,
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// Отримання всіх дітей із короткими даними психологічної картки
router.get('/cards', async (req, res) => {
  try {
    const allChildren = await db.select({
      id: children.id,
      fullName: children.fullName,
      birthDate: children.birthDate,
      groupId: children.groupId,
      status: children.status,
    }).from(children);

    const cards = await db.select().from(childPsychologicalCards);
    const result = allChildren.map(child => ({
      ...child,
      card: cards.find(c => c.childId === child.id) || null
    }));

    res.json(result);
  } catch (error) {
    console.error('Помилка завантаження психологічних карток:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Отримання психологічної картки конкретної дитини
router.get('/cards/:childId', async (req, res) => {
  try {
    const childId = parseInt(req.params.childId);
    const card = await db.select().from(childPsychologicalCards).where(eq(childPsychologicalCards.childId, childId));
    res.json(card[0] || null);
  } catch (error) {
    console.error('Помилка завантаження психологічної картки:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Створення або оновлення психологічної картки
router.post('/cards', async (req, res) => {
  try {
    const { childId, temperament, adaptationLevel, speechDevelopment, socialSkills, familyStatus, notes, recommendations } = req.body;
    
    const existing = await db.select().from(childPsychologicalCards).where(eq(childPsychologicalCards.childId, childId));
    
    let result;
    if (existing.length > 0) {
      result = await db.update(childPsychologicalCards).set({
        temperament,
        adaptationLevel,
        speechDevelopment,
        socialSkills,
        familyStatus,
        notes,
        recommendations,
      }).where(eq(childPsychologicalCards.childId, childId)).returning();
    } else {
      result = await db.insert(childPsychologicalCards).values({
        childId,
        temperament,
        adaptationLevel,
        speechDevelopment,
        socialSkills,
        familyStatus,
        notes,
        recommendations,
      }).returning();
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Помилка збереження психологічної картки:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Отримання консультацій
router.get('/consultations', async (req, res) => {
  try {
    const records = await db.select()
      .from(psychologicalConsultations)
      .orderBy(desc(psychologicalConsultations.date));
      
    // Підтягуємо імена дітей для зручного відображення
    const allChildren = await db.select({ id: children.id, fullName: children.fullName }).from(children);
    
    const result = records.map(r => ({
      ...r,
      childName: r.childId ? allChildren.find(c => c.id === r.childId)?.fullName : null
    }));

    res.json(result);
  } catch (error) {
    console.error('Помилка завантаження консультацій:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Додавання консультації
router.post('/consultations', async (req, res) => {
  try {
    const { childId, consultationType, topic, participants, notes, date } = req.body;
    const result = await db.insert(psychologicalConsultations).values({
      childId: childId || null,
      consultationType,
      topic,
      participants,
      notes,
      date: new Date(date),
    }).returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error('Помилка додавання консультації:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Оновлення консультації
router.put('/consultations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { childId, consultationType, topic, participants, notes, date } = req.body;

    const result = await db.update(psychologicalConsultations).set({
      childId: childId || null,
      consultationType,
      topic,
      participants,
      notes,
      date: new Date(date),
    }).where(eq(psychologicalConsultations.id, id)).returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Помилка оновлення консультації:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Видалення консультації
router.delete('/consultations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(psychologicalConsultations).where(eq(psychologicalConsultations.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Помилка видалення консультації:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Отримання списку дітей з інклюзивними картками
router.get('/inclusive', async (req, res) => {
  try {
    const allChildren = await db.select({
      id: children.id,
      fullName: children.fullName,
      birthDate: children.birthDate,
      groupId: children.groupId,
      status: children.status,
    }).from(children);

    const cards = await db.select().from(childInclusiveCards);
    const result = allChildren.map(child => ({
      ...child,
      inclusiveCard: cards.find(c => c.childId === child.id) || null
    }));

    res.json(result);
  } catch (error) {
    console.error('Помилка завантаження інклюзивних карток:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Отримання конкретної інклюзивної картки
router.get('/inclusive/:childId', async (req, res) => {
  try {
    const childId = parseInt(req.params.childId);
    const card = await db.select().from(childInclusiveCards).where(eq(childInclusiveCards.childId, childId));
    res.json(card[0] || null);
  } catch (error) {
    console.error('Помилка завантаження інклюзивної картки:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// Створення або оновлення інклюзивної картки
router.post('/inclusive', async (req, res) => {
  try {
    const {
      childId,
      supportLevel,
      specialNeeds,
      teamMembers,
      weeklyHours,
      adaptationNeeds,
      notes,
      individualProgram
    } = req.body;

    const existing = await db.select().from(childInclusiveCards).where(eq(childInclusiveCards.childId, childId));
    
    let result;
    if (existing.length > 0) {
      result = await db.update(childInclusiveCards).set({
        supportLevel: Number(supportLevel || 1),
        specialNeeds,
        teamMembers,
        weeklyHours: Number(weeklyHours || 0),
        adaptationNeeds,
        notes,
        individualProgram,
      }).where(eq(childInclusiveCards.childId, childId)).returning();
    } else {
      result = await db.insert(childInclusiveCards).values({
        childId,
        supportLevel: Number(supportLevel || 1),
        specialNeeds,
        teamMembers,
        weeklyHours: Number(weeklyHours || 0),
        adaptationNeeds,
        notes,
        individualProgram,
      }).returning();
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Помилка збереження інклюзивної картки:', error);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

export default router;
