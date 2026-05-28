import { Router } from 'express';
import {
  addRecipeIngredientHandler,
  createRecipeHandler,
  deleteRecipeHandler,
  deleteRecipeIngredientHandler,
  getRecipeByIdHandler,
  getRecipesHandler,
  updateRecipeHandler,
  updateRecipeIngredientHandler,
} from '../controllers/recipes';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getRecipesHandler);
router.get('/:id', getRecipeByIdHandler);
router.post('/', createRecipeHandler);
router.put('/:id', updateRecipeHandler);
router.delete('/:id', deleteRecipeHandler);
router.post('/:id/ingredients', addRecipeIngredientHandler);
router.put('/:id/ingredients/:ingredientId', updateRecipeIngredientHandler);
router.delete('/:id/ingredients/:ingredientId', deleteRecipeIngredientHandler);

export default router;
