import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDetailedMenuReportRows } from '../src/services/detailedMenuReport';

test('detailed menu report uses localized meal labels and converts ingredient quantities to grams', () => {
  const rows = buildDetailedMenuReportRows({
    id: 12,
    date: '2026-07-21',
    childrenCount0_4: 10,
    childrenCount5_7: 5,
    employeesCount: 2,
    items: [{
      id: 34,
      mealType: 'breakfast',
      mealTypeLabel: 'Сніданок',
      recipeName: 'Каша вівсяна',
      defaultOutputWeight: 200,
      outputWeight0_4: 180,
      outputWeight5_7: 200,
      outputWeightEmployees: 220,
      productBreakdown: [{
        productName: 'Пластівці вівсяні',
        grossQuantity0_4: 0.5,
        grossQuantity5_7: 0.35,
        grossQuantityEmployees: 0.16,
        totalGrossQuantity: 1.01,
      }],
    }],
  });

  assert.equal(rows[0].mealTypeLabel, 'Сніданок');
  assert.equal(rows[0].outputWeight0_4, 180);
  assert.deepEqual(rows[0].ingredients[0], {
    productName: 'Пластівці вівсяні',
    gramsPerPerson0_4: 50,
    gramsPerPerson5_7: 70,
    gramsPerEmployee: 80,
    totalGrams: 1010,
  });
});
