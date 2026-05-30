import React from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface ProductBreakdownRow {
  productName: string;
  unit: string;
  grossQuantity0_4: number;
  grossQuantity5_7: number;
  grossQuantityEmployees?: number;
  netQuantity0_4: number;
  netQuantity5_7: number;
  netQuantityEmployees?: number;
  totalGrossQuantity: number;
  totalNetQuantity: number;
  unitPrice: number;
  cost0_4: number;
  cost5_7: number;
  costEmployees?: number;
  totalCost: number;
}

interface MenuItemPrintRow {
  mealType: string;
  mealTypeLabel: string;
  recipeName: string;
  recipeDishType?: string | null;
  defaultOutputWeight: number;
  outputWeight0_4?: number | null;
  outputWeight5_7?: number | null;
  outputWeightEmployees?: number | null;
  hasAdjustments: boolean;
  adjustmentsCount: number;
  productBreakdown: ProductBreakdownRow[];
  cost0_4: number;
  cost5_7: number;
  costEmployees?: number;
}

interface PrintMenuProps {
  data: {
    menu: any;
    items: MenuItemPrintRow[];
    summaryNeeds: ProductBreakdownRow[];
    totals: {
      totalChildren: number;
      totalEmployees?: number;
      costPerChild0_4: number;
      costPerChild5_7: number;
      costPerEmployee?: number;
      totalCost0_4: number;
      totalCost5_7: number;
      totalCostEmployees?: number;
      totalCostAll: number;
    };
  };
  type: 'parents' | 'kitchen' | 'requirement';
  settings?: any;
}


const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);

const formatQty = (value: number) => value.toFixed(3);

const thClass = 'border border-black px-2 py-1 text-left font-bold';
const tdClass = 'border border-black px-2 py-1 align-top break-words';
const tdRightClass = `${tdClass} text-right`;
const tdCenterClass = `${tdClass} text-center`;

const PrintMenu: React.FC<PrintMenuProps> = ({ data, type, settings }) => {
  const { menu, items, summaryNeeds, totals } = data;
  const dateStr = format(new Date(menu.date), 'dd MMMM yyyy', { locale: uk });
  const confirmedAt = menu.confirmedAt ? format(new Date(menu.confirmedAt), 'dd.MM.yyyy HH:mm') : null;
  const totalChildren0_4 = Number(menu.childrenCount0_4 || 0);
  const totalChildren5_7 = Number(menu.childrenCount5_7 || 0);

  const groupedItems = mealOrder
    .map((mealType) => ({
      mealType,
      label: menu.mealTypeLabels?.[mealType] ?? mealType,
      items: items.filter((item) => item.mealType === mealType),
    }))
    .filter((group) => group.items.length > 0);

  const flatProductLines = groupedItems.flatMap((group) =>
    group.items.flatMap((item) =>
      item.productBreakdown.map((product, index) => ({
        id: `${group.mealType}-${item.recipeName}-${product.productName}-${index}`,
        mealLabel: group.label,
        recipeName: item.recipeName,
        output0_4: item.outputWeight0_4 || item.defaultOutputWeight,
        output5_7: item.outputWeight5_7 || item.defaultOutputWeight,
        ...product,
      }))
    )
  );

  const getPerChildCost = (value: number, childrenCount: number) =>
    childrenCount > 0 ? value / childrenCount : 0;

  const title = type === 'kitchen' ? 'Розкладка продуктів для кухні' : 'Звітне меню на день';

  // --- REQUIREMENT PRINT (МЕНЮ-ВИМОГА) ---
  if (type === 'requirement') {
    const allMenuRecipes = groupedItems.flatMap((group) => 
      group.items.map((item, idx) => ({
        key: `${group.mealType}-${item.recipeName}-${idx}`,
        mealLabel: group.label,
        recipeName: item.recipeName,
        outputWeight0_4: item.outputWeight0_4 || item.defaultOutputWeight,
        outputWeight5_7: item.outputWeight5_7 || item.defaultOutputWeight,
        outputWeightEmployees: item.outputWeightEmployees || item.defaultOutputWeight,
      }))
    );

    return (
      <div className="bg-white p-4 text-[10px] text-black print:p-0">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: landscape; margin: 8mm; }
            body { font-size: 8px; }
            .print-landscape-table { width: 100% !important; }
          }
        `}} />
        <table className="w-full border-collapse border border-black table-fixed">
          <tbody>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={3}>Установа / Заклад</td>
              <td className={tdClass} colSpan={allMenuRecipes.length + 1}>{settings?.name || 'Заклад дошкільної освіти'}</td>
              <td className={`${tdClass} font-bold`} colSpan={1}>Затверджую</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={3}>Адреса</td>
              <td className={tdClass} colSpan={allMenuRecipes.length + 1}>{settings?.address || 'Адресу не вказано'}</td>
              <td className={tdClass} colSpan={1}>Директор: _________________</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={3}>Назва документа</td>
              <td className={`${tdCenterClass} font-bold uppercase`} colSpan={allMenuRecipes.length + 1}>МЕНЮ-ВИМОГА НА ВИДАЧУ ПРОДУКТІВ ХАРЧУВАННЯ</td>
              <td className={`${tdClass} font-bold`} colSpan={1}>Дата: {dateStr}</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={2}>Діти 0-4: {totalChildren0_4} | Діти 5-7: {totalChildren5_7}</td>
              <td className={`${tdClass} font-bold`} colSpan={2}>Працівники: {menu.employeesCount || 0}</td>
              <td className={`${tdClass} font-bold`} colSpan={allMenuRecipes.length + 1 - 3}>Усього на харчуванні: {totals.totalChildren + (totals.totalEmployees || 0)}</td>
              <td className={`${tdClass} font-bold`} colSpan={1}>Статус: {menu.isConfirmed ? 'Підтверджено' : 'Чернетка'}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse border border-black table-fixed print-landscape-table">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} text-center w-[120px]`} rowSpan={2}>Назва продукту</th>
              <th className={`${thClass} text-center w-[35px]`} rowSpan={2}>Од. вим.</th>
              <th className={`${thClass} text-center`} colSpan={allMenuRecipes.length}>Назва страв та вихід порції</th>
              <th className={`${thClass} text-center w-[65px]`} rowSpan={2}>Разом (брутто)</th>
              <th className={`${thClass} text-center w-[55px]`} rowSpan={2}>Ціна за од., грн</th>
              <th className={`${thClass} text-center w-[65px]`} rowSpan={2}>Загальна сума, грн</th>
            </tr>
            <tr className="bg-gray-100">
              {allMenuRecipes.map((recipe) => (
                <th key={recipe.key} className={`${thClass} text-center text-[8px] leading-tight font-normal`}>
                  <div className="font-bold text-gray-800">{recipe.mealLabel}</div>
                  <div className="truncate" title={recipe.recipeName}>{recipe.recipeName}</div>
                  <div className="text-[7px] text-gray-500 mt-0.5">
                    Вих: {recipe.outputWeight0_4}/{recipe.outputWeight5_7}{recipe.outputWeightEmployees ? `/${recipe.outputWeightEmployees}` : ''}г
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryNeeds.map((need, idx) => (
              <tr key={`${need.productName}-${idx}`}>
                <td className={`${tdClass} font-bold`}>{need.productName}</td>
                <td className={tdCenterClass}>{need.unit}</td>
                {allMenuRecipes.map((recipe) => {
                  const matchedLine = flatProductLines.find((line) => 
                    line.recipeName === recipe.recipeName && 
                    line.productName === need.productName &&
                    line.mealLabel === recipe.mealLabel
                  );
                  return (
                    <td key={recipe.key} className={tdRightClass}>
                      {matchedLine ? formatQty(matchedLine.totalGrossQuantity) : '—'}
                    </td>
                  );
                })}
                <td className={`${tdRightClass} font-bold`}>{formatQty(need.totalGrossQuantity)}</td>
                <td className={tdRightClass}>{formatQty(need.unitPrice)}</td>
                <td className={`${tdRightClass} font-bold bg-gray-50/50`}>{formatQty(need.totalCost)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className={tdClass} colSpan={allMenuRecipes.length + 2}>Загальна вартість продуктів за день</td>
              <td className={tdRightClass} colSpan={3}>{formatMoney(totals.totalCostAll)}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} text-center`}>Здав (Комірник)</th>
              <th className={`${thClass} text-center`}>Прийняв (Кухар)</th>
              <th className={`${thClass} text-center`}>Перевірив (Медсестра)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass} height={35}>Комірник: {settings?.storekeeperName || '____________________'}</td>
              <td className={tdClass}>Кухар: {settings?.cookName || '____________________'}</td>
              <td className={tdClass}>Медсестра: {settings?.nurseName || '____________________'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // --- KITCHEN PRINT (РОЗКЛАДКА) ---
  if (type === 'kitchen') {
    return (
      <div className="bg-white p-4 text-[11px] text-black print:p-0">
        <table className="w-full border-collapse border border-black table-fixed">
          <tbody>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={2}>Заклад</td>
              <td className={tdClass} colSpan={4}>{settings?.name || 'Заклад дошкільної освіти'}</td>
              <td className={`${tdClass} font-bold`} colSpan={1}>Дата</td>
              <td className={tdClass} colSpan={1}>{dateStr}</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={2}>Адреса</td>
              <td className={tdClass} colSpan={6}>{settings?.address || 'Адресу не вказано'}</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`} colSpan={2}>Назва документа</td>
              <td className={`${tdCenterClass} font-bold uppercase`} colSpan={4}>Розкладка продуктів для кухні</td>
              <td className={`${tdClass} font-bold`} colSpan={1}>Статус</td>
              <td className={tdClass} colSpan={1}>{menu.isConfirmed ? 'Підтверджено' : 'Чернетка'}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} text-center`}>Показник</th>
              <th className={`${thClass} text-center`}>0-4</th>
              <th className={`${thClass} text-center`}>5-7</th>
              <th className={`${thClass} text-center`}>Разом</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass}>Кількість дітей</td>
              <td className={tdCenterClass}>{totalChildren0_4}</td>
              <td className={tdCenterClass}>{totalChildren5_7}</td>
              <td className={tdCenterClass}>{totals.totalChildren}</td>
            </tr>
            <tr>
              <td className={tdClass}>Кількість працівників</td>
              <td className={tdCenterClass} colSpan={2}>—</td>
              <td className={tdCenterClass}>{menu.employeesCount || 0}</td>
            </tr>
            <tr>
              <td className={`${tdClass} font-bold`}>Усього осіб на харчуванні</td>
              <td className={tdCenterClass} colSpan={2}>—</td>
              <td className={`${tdCenterClass} font-bold`}>{totals.totalChildren + (totals.totalEmployees || 0)}</td>
            </tr>
            <tr>
              <td className={tdClass}>Кількість страв у меню</td>
              <td className={tdCenterClass} colSpan={3}>{items.length}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} w-[12%] text-center`}>Прийом їжі</th>
              <th className={`${thClass} w-[40%] text-center`}>Страва</th>
              <th className={`${thClass} w-[12%] text-center`}>Вихід 0-4, г</th>
              <th className={`${thClass} w-[12%] text-center`}>Вихід 5-7, г</th>
              <th className={`${thClass} w-[12%] text-center`}>Кільк. продуктів</th>
              <th className={`${thClass} w-[12%] text-center`}>Примітка</th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.map((group) => (
              <React.Fragment key={group.mealType}>
                {group.items.map((item, index) => (
                  <tr key={`${group.mealType}-${item.recipeName}-${index}`}>
                    <td className={tdClass}>{index === 0 ? group.label : ''}</td>
                    <td className={tdClass}>{item.recipeName}</td>
                    <td className={tdCenterClass}>{item.outputWeight0_4 || item.defaultOutputWeight}</td>
                    <td className={tdCenterClass}>{item.outputWeight5_7 || item.defaultOutputWeight}</td>
                    <td className={tdCenterClass}>{item.productBreakdown.length}</td>
                    <td className={tdClass}>{item.hasAdjustments ? `Коригування: ${item.adjustmentsCount}` : ''}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} w-[29%] text-center`}>Продукт</th>
              <th className={`${thClass} w-[7%] text-center`}>Од.</th>
              <th className={`${thClass} w-[14%] text-right`}>Потрібно 0-4</th>
              <th className={`${thClass} w-[14%] text-right`}>Потрібно 5-7</th>
              <th className={`${thClass} w-[14%] text-right`}>Разом</th>
              <th className={`${thClass} w-[22%] text-center`}>Примітка</th>
            </tr>
          </thead>
          <tbody>
            {summaryNeeds.map((need, index) => (
              <tr key={`${need.productName}-${index}`}>
                <td className={tdClass}>{need.productName}</td>
                <td className={tdCenterClass}>{need.unit}</td>
                <td className={tdRightClass}>{formatQty(need.grossQuantity0_4)}</td>
                <td className={tdRightClass}>{formatQty(need.grossQuantity5_7)}</td>
                <td className={tdRightClass}>{formatQty(need.totalGrossQuantity)}</td>
                <td className={tdClass}></td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className={tdClass} colSpan={4}>Разом по продуктах</td>
              <td className={tdRightClass}>{formatQty(summaryNeeds.reduce((sum, need) => sum + need.totalGrossQuantity, 0))}</td>
              <td className={tdClass}></td>
            </tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} w-[12%] text-center`}>Прийом їжі</th>
              <th className={`${thClass} w-[22%] text-center`}>Страва</th>
              <th className={`${thClass} w-[24%] text-center`}>Продукт</th>
              <th className={`${thClass} w-[8%] text-center`}>Од.</th>
              <th className={`${thClass} w-[11%] text-right`}>0-4</th>
              <th className={`${thClass} w-[11%] text-right`}>5-7</th>
              <th className={`${thClass} w-[12%] text-right`}>Разом</th>
            </tr>
          </thead>
          <tbody>
            {flatProductLines.map((line) => (
              <tr key={line.id}>
                <td className={tdClass}>{line.mealLabel}</td>
                <td className={tdClass}>{line.recipeName}</td>
                <td className={tdClass}>{line.productName}</td>
                <td className={tdCenterClass}>{line.unit}</td>
                <td className={tdRightClass}>{formatQty(line.grossQuantity0_4)}</td>
                <td className={tdRightClass}>{formatQty(line.grossQuantity5_7)}</td>
                <td className={tdRightClass}>{formatQty(line.totalGrossQuantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className={`${thClass} text-center`}>Відповідальна особа 1</th>
              <th className={`${thClass} text-center`}>Відповідальна особа 2</th>
              <th className={`${thClass} text-center`}>Відповідальна особа 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass}>Комірник: {settings?.storekeeperName || '____________________'}</td>
              <td className={tdClass}>Завгосп: {settings?.supplyManagerName || '____________________'}</td>
              <td className={tdClass}>Кухар: {settings?.cookName || '____________________'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // --- PARENTS PRINT ---
  return (
    <div className="bg-white p-4 text-[11px] text-black print:p-0">
      <table className="w-full border-collapse border border-black table-fixed">
        <tbody>
          <tr>
            <td className={`${tdClass} font-bold`} colSpan={2}>Заклад</td>
            <td className={tdClass} colSpan={4}>{settings?.name || 'Заклад дошкільної освіти'}</td>
            <td className={`${tdClass} font-bold`} colSpan={1}>ЄДРПОУ</td>
            <td className={tdClass} colSpan={1}>{settings?.edrpou || '—'}</td>
          </tr>
          <tr>
            <td className={`${tdClass} font-bold`} colSpan={2}>Адреса</td>
            <td className={tdClass} colSpan={6}>{settings?.address || 'Адресу не вказано'}</td>
          </tr>
          <tr>
            <td className={`${tdClass} font-bold`} colSpan={2}>Назва документа</td>
            <td className={`${tdCenterClass} font-bold uppercase`} colSpan={4}>{title}</td>
            <td className={`${tdClass} font-bold`} colSpan={1}>Дата</td>
            <td className={tdClass} colSpan={1}>{dateStr}</td>
          </tr>
          <tr>
            <td className={`${tdClass} font-bold`} colSpan={2}>Статус</td>
            <td className={tdClass} colSpan={2}>{menu.isConfirmed ? 'Підтверджено' : 'Чернетка'}</td>
            <td className={`${tdClass} font-bold`} colSpan={2}>Підтверджено</td>
            <td className={tdClass} colSpan={2}>{confirmedAt || '—'}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse border border-black table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <th className={thClass}>Показник</th>
            <th className={`${thClass} text-right`}>0-4</th>
            <th className={`${thClass} text-right`}>5-7</th>
            <th className={`${thClass} text-right`}>Разом / примітка</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>Кількість дітей / працівників</td>
            <td className={tdRightClass}>{totalChildren0_4}</td>
            <td className={tdRightClass}>{totalChildren5_7}</td>
            <td className={tdRightClass}>
              Діти: {totals.totalChildren} | Персонал: {totals.totalEmployees || 0}
            </td>
          </tr>
          <tr>
            <td className={tdClass}>Собівартість на 1 особу</td>
            <td className={tdRightClass}>{formatMoney(totals.costPerChild0_4)}</td>
            <td className={tdRightClass}>{formatMoney(totals.costPerChild5_7)}</td>
            <td className={tdRightClass}>
              Персонал: {formatMoney(totals.costPerEmployee || 0)}
            </td>
          </tr>
          <tr>
            <td className={tdClass}>Сума витрат за день</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost0_4)}</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost5_7)}</td>
            <td className={`${tdRightClass} font-bold bg-gray-50`}>
              {formatMoney(totals.totalCostAll)}
              <div className="text-[8px] font-normal text-gray-500 mt-0.5">
                (в т.ч. персонал: {formatMoney(totals.totalCostEmployees || 0)})
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse border border-black table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <th className={`${thClass} w-[12%]`}>Прийом їжі</th>
            <th className={`${thClass} w-[28%]`}>Страва</th>
            <th className={`${thClass} w-[8%] text-center`}>Вихід 0-4</th>
            <th className={`${thClass} w-[8%] text-center`}>Вихід 5-7</th>
            <th className={`${thClass} w-[11%] text-right`}>На 1 дит. 0-4</th>
            <th className={`${thClass} w-[11%] text-right`}>Сума 0-4</th>
            <th className={`${thClass} w-[11%] text-right`}>На 1 дит. 5-7</th>
            <th className={`${thClass} w-[11%] text-right`}>Сума 5-7</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map((group) => (
            <React.Fragment key={group.mealType}>
              {group.items.map((item, index) => (
                <tr key={`${group.mealType}-${item.recipeName}-${index}`}>
                  <td className={tdClass}>{index === 0 ? group.label : ''}</td>
                  <td className={tdClass}>{item.recipeName}{item.hasAdjustments ? ` (Коригування: ${item.adjustmentsCount})` : ''}</td>
                  <td className={tdCenterClass}>{item.outputWeight0_4 || item.defaultOutputWeight}</td>
                  <td className={tdCenterClass}>{item.outputWeight5_7 || item.defaultOutputWeight}</td>
                  <td className={tdRightClass}>{formatMoney(getPerChildCost(item.cost0_4, totalChildren0_4))}</td>
                  <td className={tdRightClass}>{formatMoney(item.cost0_4)}</td>
                  <td className={tdRightClass}>{formatMoney(getPerChildCost(item.cost5_7, totalChildren5_7))}</td>
                  <td className={tdRightClass}>{formatMoney(item.cost5_7)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className={tdClass} colSpan={5}>Разом за день</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost0_4)}</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost5_7)}</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCostAll)}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse border border-black table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <th className={`${thClass} w-[24%]`}>Підсумковий показник</th>
            <th className={`${thClass} w-[19%] text-right`}>0-4</th>
            <th className={`${thClass} w-[19%] text-right`}>5-7</th>
            <th className={`${thClass} w-[19%] text-right`}>Разом</th>
            <th className={`${thClass} w-[19%] text-right`}>Примітка</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>Собівартість на одну дитину</td>
            <td className={tdRightClass}>{formatMoney(totals.costPerChild0_4)}</td>
            <td className={tdRightClass}>{formatMoney(totals.costPerChild5_7)}</td>
            <td className={tdRightClass}>—</td>
            <td className={tdClass}>денний показник</td>
          </tr>
          <tr>
            <td className={tdClass}>Сума по віковій групі</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost0_4)}</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCost5_7)}</td>
            <td className={tdRightClass}>{formatMoney(totals.totalCostAll)}</td>
            <td className={tdClass}>за меню дня</td>
          </tr>
          <tr>
            <td className={tdClass}>Кількість страв</td>
            <td className={tdRightClass} colSpan={3}>{items.length}</td>
            <td className={tdClass}>усього позицій у меню</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-4 w-full border-collapse border border-black table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <th className={`${thClass} text-center`}>Підпис 1</th>
            <th className={`${thClass} text-center`}>Підпис 2</th>
            <th className={`${thClass} text-center`}>Підпис 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>Директор (завідувач): {settings?.directorName || '____________________'}</td>
            <td className={tdClass}>Медична сестра: {settings?.nurseName || '____________________'}</td>
            <td className={tdClass}>Кухар / відповідальний: {settings?.cookName || '____________________'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PrintMenu;
