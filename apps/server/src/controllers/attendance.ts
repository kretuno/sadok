import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getAttendanceForDate,
  getAttendanceSummary,
  saveAttendance,
} from '../services/attendance';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
};

export const getAttendanceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { date, groupId } = req.query;
    if (!date) throw new Error('Параметр date є обов\'язковим');
    
    const data = await getAttendanceForDate(
      String(date), 
      groupId ? Number(groupId) : undefined
    );
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const saveAttendanceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { date, records } = req.body;
    const data = await saveAttendance(date, records);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getAttendanceSummaryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) throw new Error('Параметр date є обов\'язковим');
    
    const data = await getAttendanceSummary(String(date));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
