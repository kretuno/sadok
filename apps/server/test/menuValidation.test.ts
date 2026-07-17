import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDailyMenuInput } from '../src/services/menuModels';

const validMenu = () => ({
  date: '2026-07-17',
  childrenCount0_4: 12,
  childrenCount5_7: 18,
  employeesCount: 4,
  targetPrice0_4: 50,
  targetPrice5_7: 65,
  items: [{
    recipeId: 1,
    mealType: 'lunch',
    outputWeight0_4: null,
    outputWeight5_7: null,
    outputWeightEmployees: null,
    overrides: [{ recipeIngredientId: null, productId: 2, ageGroup: 'common', grossWeight: 25, netWeight: 25 }],
  }],
});

test('menu validation accepts a complete menu with a custom product adjustment', () => {
  const result = validateDailyMenuInput(validMenu());
  assert.equal(result.items[0].overrides?.[0].productId, 2);
});

test('menu validation rejects malformed dates and negative values before persistence', () => {
  assert.throws(() => validateDailyMenuInput({ ...validMenu(), date: '17.07.2026' }), /Некоректна дата/);
  assert.throws(() => validateDailyMenuInput({ ...validMenu(), childrenCount0_4: -1 }), /childrenCount0_4/);
  assert.throws(() => validateDailyMenuInput({ ...validMenu(), items: [{}] }), /Некоректна страва/);
});

test('menu validation requires exactly one adjustment source', () => {
  const bothSources = validMenu();
  bothSources.items[0].overrides![0] = {
    recipeIngredientId: 1,
    productId: 2,
    ageGroup: 'common',
    grossWeight: 25,
    netWeight: 25,
  };

  assert.throws(() => validateDailyMenuInput(bothSources), /рівно один інгредієнт або продукт/);
});
