import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  addRecipeIngredient,
  createRecipe,
  deleteRecipe,
  deleteRecipeIngredient,
  getRecipeDetails,
  getRecipesOverview,
  updateRecipe,
  updateRecipeIngredient,
} from '../services/recipes';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Невідома помилка';
};

export const getRecipesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const data = await getRecipesOverview(search);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Помилка при завантаженні рецептів',
      error: getErrorMessage(error),
    });
  }
};

export const getRecipeByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getRecipeDetails(Number(req.params.id));
    res.json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Рецепт не знайдено' ? 404 : 400).json({ message });
  }
};

export const createRecipeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await createRecipe(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const updateRecipeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await updateRecipe(Number(req.params.id), req.body);
    res.json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Рецепт не знайдено' ? 404 : 400).json({ message });
  }
};

export const deleteRecipeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await deleteRecipe(Number(req.params.id));
    res.json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Рецепт не знайдено' ? 404 : 400).json({ message });
  }
};

export const addRecipeIngredientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await addRecipeIngredient(Number(req.params.id), req.body);
    res.status(201).json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(message === 'Рецепт не знайдено' ? 404 : 400).json({ message });
  }
};

export const updateRecipeIngredientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await updateRecipeIngredient(
      Number(req.params.id),
      Number(req.params.ingredientId),
      req.body
    );
    res.json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(
      message === 'Рецепт не знайдено' || message === 'Інгредієнт рецепта не знайдено' ? 404 : 400
    ).json({ message });
  }
};

export const deleteRecipeIngredientHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = await deleteRecipeIngredient(Number(req.params.id), Number(req.params.ingredientId));
    res.json(data);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(
      message === 'Рецепт не знайдено' || message === 'Інгредієнт рецепта не знайдено' ? 404 : 400
    ).json({ message });
  }
};
