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
import { authenticateToken, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizePermission('menu', 'view'), getRecipesHandler);
router.get('/:id', authorizePermission('menu', 'view'), getRecipeByIdHandler);
router.post('/', authorizePermission('menu', 'edit'), createRecipeHandler);
router.put('/:id', authorizePermission('menu', 'edit'), updateRecipeHandler);
router.delete('/:id', authorizePermission('menu', 'delete'), deleteRecipeHandler);
router.post('/:id/ingredients', authorizePermission('menu', 'edit'), addRecipeIngredientHandler);
router.put('/:id/ingredients/:ingredientId', authorizePermission('menu', 'edit'), updateRecipeIngredientHandler);
router.delete('/:id/ingredients/:ingredientId', authorizePermission('menu', 'delete'), deleteRecipeIngredientHandler);

export default router;
