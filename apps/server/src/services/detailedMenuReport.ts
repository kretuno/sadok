const roundGrams = (value: number) => Number((value * 1000).toFixed(2));

interface ProductBreakdownLine {
  productName: string;
  grossQuantity0_4: number;
  grossQuantity5_7: number;
  grossQuantityEmployees?: number;
  totalGrossQuantity: number;
}

interface DetailedMenuItem {
  id: number;
  mealType: string;
  mealTypeLabel: string;
  recipeName: string;
  defaultOutputWeight: number;
  outputWeight0_4?: number | null;
  outputWeight5_7?: number | null;
  outputWeightEmployees?: number | null;
  productBreakdown: ProductBreakdownLine[];
}

interface DetailedMenuSource {
  id: number;
  date: Date | string;
  childrenCount0_4: number;
  childrenCount5_7: number;
  employeesCount: number;
  items?: DetailedMenuItem[];
}

export interface DetailedMenuIngredientRow {
  productName: string;
  gramsPerPerson0_4: number;
  gramsPerPerson5_7: number;
  gramsPerEmployee: number;
  totalGrams: number;
}

export interface DetailedMenuReportRow {
  id: number;
  menuId: number;
  date: Date | string;
  mealType: string;
  mealTypeLabel: string;
  dishName: string;
  count0_4: number;
  count5_7: number;
  countEmployees: number;
  outputWeight0_4: number;
  outputWeight5_7: number;
  outputWeightEmployees: number;
  ingredients: DetailedMenuIngredientRow[];
}

const gramsPerPerson = (quantity: number, people: number) =>
  people > 0 ? Number(((quantity * 1000) / people).toFixed(2)) : 0;

export const buildDetailedMenuReportRows = (menu: DetailedMenuSource): DetailedMenuReportRow[] =>
  (menu.items ?? []).map((item) => ({
    id: item.id,
    menuId: menu.id,
    date: menu.date,
    mealType: item.mealType,
    mealTypeLabel: item.mealTypeLabel,
    dishName: item.recipeName,
    count0_4: menu.childrenCount0_4,
    count5_7: menu.childrenCount5_7,
    countEmployees: menu.employeesCount,
    outputWeight0_4: Number(item.outputWeight0_4 ?? item.defaultOutputWeight ?? 0),
    outputWeight5_7: Number(item.outputWeight5_7 ?? item.defaultOutputWeight ?? 0),
    outputWeightEmployees: Number(item.outputWeightEmployees ?? item.defaultOutputWeight ?? 0),
    ingredients: item.productBreakdown.map((product) => ({
      productName: product.productName,
      gramsPerPerson0_4: gramsPerPerson(product.grossQuantity0_4, menu.childrenCount0_4),
      gramsPerPerson5_7: gramsPerPerson(product.grossQuantity5_7, menu.childrenCount5_7),
      gramsPerEmployee: gramsPerPerson(product.grossQuantityEmployees ?? 0, menu.employeesCount),
      totalGrams: roundGrams(product.totalGrossQuantity),
    })),
  }));
