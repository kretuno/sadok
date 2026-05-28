import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { uploadPath } from '../paths';
import {
  createChild,
  createGroup,
  getChildren,
  getGroupDetails,
  getGroups,
  updateGroup,
  archiveChild,
  regenerateQRToken,
  updateChild,
} from '../services/children';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
};

export const getGroupsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getGroups();
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const createGroupHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createGroup({
      name: req.body.name,
      primaryEducatorId: req.body.primaryEducatorId ? Number(req.body.primaryEducatorId) : null,
      assistantEducatorId: req.body.assistantEducatorId ? Number(req.body.assistantEducatorId) : null,
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateGroupHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await updateGroup(Number(req.params.id), {
      name: req.body.name,
      primaryEducatorId: req.body.primaryEducatorId ? Number(req.body.primaryEducatorId) : null,
      assistantEducatorId: req.body.assistantEducatorId ? Number(req.body.assistantEducatorId) : null,
    });
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const getGroupDetailsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getGroupDetails(Number(req.params.id));
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: getErrorMessage(error) });
  }
};

export const getChildrenHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getChildren();
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const createChildHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createChild(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const archiveChildHandler = async (req: AuthRequest, res: Response) => {
  try {
    const childId = Number(req.params.id);
    const reason = req.body.reason || 'Вибув із закладу';
    const data = await archiveChild(childId, reason);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
export const regenerateQRTokenHandler = async (req: AuthRequest, res: Response) => {
  try {
    const childId = Number(req.params.id);
    if (isNaN(childId)) {
      throw new Error(`Некоректний ID дитини: ${req.params.id}`);
    }
    console.log(`[QR] Регенерація токена для дитини ID: ${childId}`);
    const data = await regenerateQRToken(childId);
    console.log(`[QR] Токен успішно згенеровано для ID: ${childId}`);
    res.json(data);
  } catch (error) {
    console.error('[QR Error]', error);
    res.status(400).json({ 
      message: getErrorMessage(error),
      details: error instanceof Error ? error.stack : undefined
    });
  }
};

export const updateChildHandler = async (req: AuthRequest, res: Response) => {
  try {
    const childId = Number(req.params.id);
    console.log(`[Controller] PATCH /children/${childId} payload:`, JSON.stringify(req.body));
    const data = await updateChild(childId, req.body);
    res.json(data);
  } catch (error) {
    console.error(`[Error] PATCH /children failed:`, error);
    res.status(400).json({ 
      message: getErrorMessage(error),
      details: error instanceof Error ? error.stack : undefined 
    });
  }
};

export const uploadChildPhotoHandler = async (req: AuthRequest, res: Response) => {
  try {
    const childId = Number(req.params.id);
    const file = req.file;

    if (!file) {
      throw new Error('Файл фото не передано');
    }

    const uploadsDir = uploadPath('children', String(childId));
    fs.mkdirSync(uploadsDir, { recursive: true });

    const extension = path.extname(file.originalname || '') || '.jpg';
    const fileName = `profile-${Date.now()}${extension.toLowerCase()}`;
    const destination = path.join(uploadsDir, fileName);

    fs.renameSync(file.path, destination);

    const previous = await updateChild(childId, {
      photoPath: `/uploads/children/${childId}/${fileName}`,
    });

    res.json(previous[0]);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({
      message: getErrorMessage(error),
    });
  }
};
