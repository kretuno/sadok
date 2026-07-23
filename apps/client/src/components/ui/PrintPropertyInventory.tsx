import React from 'react';
import type { KindergartenSettings } from '../../contexts/SettingsContext';

interface InventoryItem {
  id: number;
  inventoryNumber: string;
  name: string;
  category: string;
  quantity?: number;
  location?: string | null;
  assignmentLabel?: string;
  initialValue?: number | null;
  status?: string | null;
  arrivalDate?: string | null;
  notes?: string | null;
}

interface PrintPropertyInventoryProps {
  items: InventoryItem[];
  filterLabel: string;
  settings: KindergartenSettings | null;
}

const STATUS_LABELS: Record<string, string> = {
  good: 'Відмінний / Робочий',
  satisfactory: 'Задовільний',
  needs_repair: 'Потребує ремонту',
  broken: 'Зламано / Не працює',
  written_off: 'Списано',
};

const formatMoney = (value?: number | null) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);

const PrintPropertyInventory: React.FC<PrintPropertyInventoryProps> = ({ items, filterLabel, settings }) => {
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalValue = items.reduce((sum, item) => sum + ((item.initialValue || 0) * (item.quantity || 1)), 0);

  return (
    <div className="bg-white p-6 text-[11px] text-black print:p-0">
      <style>{`
        .prop-print-table { width: 100%; border-collapse: collapse; color: #000; font-size: 11px; }
        .prop-print-table td, .prop-print-table th { border: 1px solid #000; padding: 5px 6px; }
        .prop-print-table th { background: #f3f4f6; font-weight: 700; text-align: center; }
        .prop-print-center { text-align: center; }
        .prop-print-right { text-align: right; }
        .prop-print-label { font-weight: 700; }
        .prop-print-title { padding: 12px 6px !important; text-align: center; font-size: 16px; font-weight: 900; text-transform: uppercase; }
        .prop-print-section { margin-top: 16px; }
        .prop-print-signature { margin-top: 24px; }
        .prop-print-signature td { height: 40px; vertical-align: bottom; text-align: center; }
        @media print {
          @page { size: A4 landscape; margin: 10mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .prop-print-table thead { display: table-header-group; }
          .prop-print-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <table className="prop-print-table w-full border border-black">
        <tbody>
          <tr>
            <td colSpan={8} className="prop-print-center prop-print-label">
              {settings?.name || 'Заклад дошкільної освіти'}
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="prop-print-center">
              ЄДРПОУ: {settings?.edrpou || '—'}{settings?.address ? ` · ${settings.address}` : ''}
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="prop-print-title">
              Відомість обліку матеріальних цінностей та майна
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <span className="prop-print-label">Фільтр / Категорія:</span> {filterLabel}
            </td>
            <td colSpan={3}>
              <span className="prop-print-label">Записів:</span> {items.length} ({totalUnits} шт.)
            </td>
            <td colSpan={2} className="prop-print-right">
              <span className="prop-print-label">Дата формування:</span> {new Date().toLocaleDateString('uk-UA')}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="prop-print-table prop-print-section">
        <thead>
          <tr>
            <th className="w-8 prop-print-center">№</th>
            <th className="w-24 prop-print-center">Інв. №</th>
            <th>Найменування майна / ТМЦ</th>
            <th className="w-28">Категорія</th>
            <th className="w-16 prop-print-center">К-сть</th>
            <th>Прив'язка / Приміщення</th>
            <th className="w-28 prop-print-center">Стан</th>
            <th className="w-24 prop-print-center">Введення в експл.</th>
            <th className="w-28 prop-print-right">Перв. вартість</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={item.id}>
                <td className="prop-print-center">{index + 1}</td>
                <td className="prop-print-center font-mono font-bold">{item.inventoryNumber}</td>
                <td className="font-bold">{item.name}</td>
                <td>{item.category}</td>
                <td className="prop-print-center font-bold">{item.quantity || 1} шт.</td>
                <td>
                  <div>{item.assignmentLabel || 'Без прив’язки'}</div>
                  {item.location && <div className="text-[10px] text-gray-600">{item.location}</div>}
                </td>
                <td className="prop-print-center">{STATUS_LABELS[item.status || 'good'] || item.status}</td>
                <td className="prop-print-center">{item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString('uk-UA') : '—'}</td>
                <td className="prop-print-right font-bold">{formatMoney(item.initialValue)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} className="prop-print-center py-4">
                Записи в реєстрі відсутні
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-50">
            <td colSpan={4} className="prop-print-right uppercase">
              Загальна кількість та первісна вартість:
            </td>
            <td className="prop-print-center">{totalUnits} шт.</td>
            <td colSpan={3} className="prop-print-right font-bold">
              {formatMoney(totalValue)}
            </td>
          </tr>
        </tfoot>
      </table>

      <table className="prop-print-table prop-print-signature">
        <tbody>
          <tr>
            <td>Матеріально відповідальна особа: ___________________</td>
            <td>Головний бухгалтер: ___________________</td>
            <td>Керівник закладу: ___________________</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PrintPropertyInventory;
