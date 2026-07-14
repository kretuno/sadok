import { NextFunction, Request, Response } from 'express';

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]+$/u;
const ALLOWED_ROLES = new Set(['admin', 'user']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : null;

const sendValidationError = (res: Response, message: string) =>
  res.status(400).json({ message });

export const validateLoginInput = (req: Request, res: Response, next: NextFunction) => {
  if (!isRecord(req.body)) {
    return sendValidationError(res, 'Некоректний формат запиту');
  }

  const username = normalizedString(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : null;

  if (!username || username.length > 64 || !USERNAME_PATTERN.test(username)) {
    return sendValidationError(res, 'Вкажіть коректний логін');
  }
  if (!password || password.length > 128) {
    return sendValidationError(res, 'Вкажіть коректний пароль');
  }

  req.body.username = username;
  next();
};

const validateUserFields = (
  req: Request,
  res: Response,
  next: NextFunction,
  passwordRequired: boolean,
  usernameRequired: boolean
) => {
  if (!isRecord(req.body)) {
    return sendValidationError(res, 'Некоректний формат запиту');
  }

  const fullName = normalizedString(req.body.fullName);
  const username = normalizedString(req.body.username);
  const password = req.body.password;
  const role = normalizedString(req.body.role);

  if (!fullName || fullName.length > 120) {
    return sendValidationError(res, 'ПІБ має містити від 1 до 120 символів');
  }
  if (usernameRequired && !username) {
    return sendValidationError(res, 'Вкажіть логін користувача');
  }
  if (username !== null && (!username || username.length > 64 || !USERNAME_PATTERN.test(username))) {
    return sendValidationError(res, 'Логін може містити літери, цифри, крапку, дефіс і підкреслення');
  }
  if (passwordRequired && (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
    return sendValidationError(res, 'Пароль має містити від 8 до 128 символів');
  }
  if (!passwordRequired && password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
    return sendValidationError(res, 'Новий пароль має містити від 8 до 128 символів');
  }
  if (!role || !ALLOWED_ROLES.has(role)) {
    return sendValidationError(res, 'Некоректна роль користувача');
  }
  if (req.body.permissions !== undefined && !isRecord(req.body.permissions)) {
    return sendValidationError(res, 'Некоректний формат прав доступу');
  }
  if ('isActive' in req.body && typeof req.body.isActive !== 'boolean') {
    return sendValidationError(res, 'Некоректний статус користувача');
  }

  req.body.fullName = fullName;
  if (username !== null) req.body.username = username;
  req.body.role = role;
  next();
};

export const validateCreateUserInput = (req: Request, res: Response, next: NextFunction) =>
  validateUserFields(req, res, next, true, true);

export const validateUpdateUserInput = (req: Request, res: Response, next: NextFunction) =>
  typeof req.body?.isActive !== 'boolean'
    ? sendValidationError(res, 'Некоректний статус користувача')
    : validateUserFields(req, res, next, false, false);

export const validateNumericId = (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return sendValidationError(res, 'Некоректний ідентифікатор');
  }
  next();
};
