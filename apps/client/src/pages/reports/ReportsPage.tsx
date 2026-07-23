import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarDays, Download, FileText, Filter, Printer, Rows3, Search, X } from 'lucide-react';
import api from '../../api/axios';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../../components/ui/CustomSelect';

type ReportType = 
  | 'saldo' 
  | 'tmc-saldo'
  | 'tmc' 
  | 'menus' 
  | 'detailed-menus'
  | 'children' 
  | 'sick' 
  | 'psychology' 
  | 'attendance' 
  | 'spent-products' 
  | 'medications' 
  | 'spent-medications'
  | 'utilities'
  | 'audit';

// API fields differ for every report and are rendered through the selected report schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportRow = Record<string, any>;

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { can } = useAuth();
  const canPrintReports = can('reports', 'print');
  const [reportType, setReportType] = useState<ReportType>('saldo');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const reportOptions = [
    { id: 'saldo', name: t('report_saldo') },
    { id: 'tmc-saldo', name: t('report_tmc_saldo') },
    { id: 'spent-products', name: t('report_spent_products') },
    { id: 'detailed-menus', name: t('report_detailed_menus') },
    { id: 'attendance', name: t('report_attendance') },
    { id: 'children', name: t('report_children') },
    { id: 'sick', name: t('report_sick') },
    { id: 'psychology', name: t('report_psychology') },
    { id: 'medications', name: t('report_medications') },
    { id: 'spent-medications', name: t('report_spent_medications') },
    { id: 'utilities', name: t('report_utilities') },
    { id: 'audit', name: t('report_audit') },
    { id: 'tmc', name: t('report_tmc') },
    { id: 'menus', name: t('report_menus') },
  ] satisfies Array<{ id: ReportType; name: string }>;

  const reportTitles: Record<ReportType, string> = {
    saldo: t('report_title_saldo'),
    'tmc-saldo': t('report_title_tmc_saldo'),
    children: t('report_title_children'),
    sick: t('report_title_sick'),
    psychology: t('report_title_psychology'),
    attendance: t('report_title_attendance'),
    'detailed-menus': t('report_title_detailed_menus'),
    'spent-products': t('report_title_spent_products'),
    medications: t('report_title_medications'),
    'spent-medications': t('report_title_spent_medications'),
    utilities: t('report_title_utilities'),
    audit: t('report_title_audit'),
    tmc: t('report_title_tmc'),
    menus: t('report_title_menus'),
  };

  const needsDateFilter = [
    'saldo', 'tmc-saldo', 'menus', 'detailed-menus', 'psychology',
    'attendance', 'spent-products', 'spent-medications', 'utilities', 'audit'
  ].includes(reportType);

  const generateReport = useCallback(async () => {
    if (needsDateFilter && startDate > endDate) {
      setError('Початкова дата не може бути пізнішою за кінцеву.');
      setData([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      let endpoint = `/reports/${reportType}`;
      if (needsDateFilter) {
        endpoint +=`?start=${startDate}&end=${endDate}`;
      }

      const res = await api.get(endpoint);
      setData(res.data);
      setGeneratedAt(new Date());
    } catch (e) {
      console.error('Не вдалося завантажити звіт', e);
      setData([]);
      setError('Не вдалося сформувати звіт. Перевірте з’єднання та повторіть спробу.');
    } finally {
      setLoading(false);
    }
  }, [endDate, needsDateFilter, reportType, startDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void generateReport(), 0);
    return () => window.clearTimeout(timeout);
  }, [generateReport]);

  const visibleData = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('uk-UA');
    if (!query) return data;

    return data.filter((row) =>
      Object.values(row).some((value) =>
        value !== null && value !== undefined
          ? (typeof value === 'object' ? JSON.stringify(value) : String(value))
            .toLocaleLowerCase('uk-UA')
            .includes(query)
          : false,
      ),
    );
  }, [data, searchQuery]);

  const isWideReport = ['saldo', 'utilities', 'audit', 'tmc', 'menus', 'detailed-menus'].includes(reportType);

  const setPeriod = (period: 'month' | 'previous-month' | 'year') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'previous-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    }

    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(getExportRows(reportType, visibleData));
      ws['!cols'] = getWorksheetWidths(ws);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports_sheet_name'));
      XLSX.writeFile(wb, `Звіт_${reportType}_${new Date().toLocaleDateString('uk-UA')}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const renderTable = () => {
    if (loading) return <div className="p-10 text-center font-bold text-gray-400">{t('reports_loading')}</div>;
    if (error) return null;
    if (!data || data.length === 0) return <div className="p-10 text-center text-gray-400">{t('reports_empty')}</div>;
    if (visibleData.length === 0) return <div className="p-10 text-center text-gray-400">За вашим пошуком нічого не знайдено</div>;

    switch (reportType) {
      case 'saldo': {
        const totalStartCost = visibleData.reduce((sum, r) => sum + (r.startCost || 0), 0);
        const totalIncomingCost = visibleData.reduce((sum, r) => sum + (r.incomingCost || 0), 0);
        const totalOutgoingCost = visibleData.reduce((sum, r) => sum + (r.outgoingCost || 0), 0);
        const totalEndCost = visibleData.reduce((sum, r) => sum + (r.endCost || 0), 0);

        return (
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-gray-100/80 text-gray-800 font-bold border-b border-gray-300 text-center">
                <th rowSpan={2} className="p-2 border border-gray-300 w-8">№ з/п</th>
                <th rowSpan={2} className="p-2 border border-gray-300 text-left">Найменування продукту харчування</th>
                <th rowSpan={2} className="p-2 border border-gray-300 w-12">Од. вим.</th>
                <th rowSpan={2} className="p-2 border border-gray-300 w-20 text-right">Ціна, грн</th>
                <th colSpan={2} className="p-2 border border-gray-300">Залишок на початок</th>
                <th colSpan={2} className="p-2 border border-gray-300">Надходження (Прихід)</th>
                <th colSpan={2} className="p-2 border border-gray-300">Витрата (Видаток)</th>
                <th colSpan={2} className="p-2 border border-gray-300">Залишок на кінець</th>
              </tr>
              <tr className="bg-gray-100/80 text-gray-800 font-bold border-b border-gray-300 text-center">
                <th className="p-1.5 border border-gray-300 w-20">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-20">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-20">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-20">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
              </tr>
              <tr className="bg-gray-200/60 text-gray-500 text-[10px] text-center font-mono">
                <th className="p-1 border border-gray-300">1</th>
                <th className="p-1 border border-gray-300">2</th>
                <th className="p-1 border border-gray-300">3</th>
                <th className="p-1 border border-gray-300">4</th>
                <th className="p-1 border border-gray-300">5</th>
                <th className="p-1 border border-gray-300">6</th>
                <th className="p-1 border border-gray-300">7</th>
                <th className="p-1 border border-gray-300">8</th>
                <th className="p-1 border border-gray-300">9</th>
                <th className="p-1 border border-gray-300">10</th>
                <th className="p-1 border border-gray-300">11</th>
                <th className="p-1 border border-gray-300">12</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleData.map((row, index) => (
                <tr key={row.id} className="hover:bg-warm-50/50">
                  <td className="p-2 border border-gray-200 text-center font-mono text-gray-500">{index + 1}</td>
                  <td className="p-2 border border-gray-200 font-bold text-gray-900">{row.name}</td>
                  <td className="p-2 border border-gray-200 text-center text-gray-600">{row.unit}</td>
                  <td className="p-2 border border-gray-200 text-right font-semibold text-gray-700">{formatMoneyValue(row.price)}</td>
                  <td className="p-2 border border-gray-200 text-right font-medium text-gray-700">{Number(row.startStock || 0).toFixed(3)}</td>
                  <td className="p-2 border border-gray-200 text-right font-semibold text-gray-800">{formatMoneyValue(row.startCost)}</td>
                  <td className="p-2 border border-gray-200 text-right font-medium text-emerald-700">{Number(row.incoming || 0) > 0 ? Number(row.incoming).toFixed(3) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold text-emerald-800">{Number(row.incomingCost || 0) > 0 ? formatMoneyValue(row.incomingCost) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-medium text-rose-700">{Number(row.outgoing || 0) > 0 ? Number(row.outgoing).toFixed(3) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold text-rose-800">{Number(row.outgoingCost || 0) > 0 ? formatMoneyValue(row.outgoingCost) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-black text-gray-900">{Number(row.endStock || 0).toFixed(3)}</td>
                  <td className="p-2 border border-gray-200 text-right font-black text-warm-900">{formatMoneyValue(row.endCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black text-gray-900 uppercase">
                <td colSpan={5} className="p-2.5 border border-gray-300 text-right">
                  ВСЬОГО ЗА ЗВІТОМ:
                </td>
                <td className="p-2.5 border border-gray-300 text-right text-gray-900">{formatMoneyValue(totalStartCost)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-emerald-800">{formatMoneyValue(totalIncomingCost)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-rose-800">{formatMoneyValue(totalOutgoingCost)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-warm-900">{formatMoneyValue(totalEndCost)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }

      case 'tmc-saldo': {
        const totalStartSum = visibleData.reduce((sum, r) => sum + (r.startSum || 0), 0);
        const totalInSum = visibleData.reduce((sum, r) => sum + (r.inSum || 0), 0);
        const totalOutSum = visibleData.reduce((sum, r) => sum + (r.outSum || 0), 0);
        const totalEndSum = visibleData.reduce((sum, r) => sum + (r.endSum || 0), 0);

        return (
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-gray-100/80 text-gray-800 font-bold border-b border-gray-300 text-center">
                <th rowSpan={2} className="p-2 border border-gray-300 w-8">№ з/п</th>
                <th rowSpan={2} className="p-2 border border-gray-300 w-24">Інв. №</th>
                <th rowSpan={2} className="p-2 border border-gray-300 text-left">Найменування майна / ТМЦ</th>
                <th rowSpan={2} className="p-2 border border-gray-300 w-28">Категорія</th>
                <th rowSpan={2} className="p-2 border border-gray-300">Прив’язка / Локація</th>
                <th rowSpan={2} className="p-2 border border-gray-300 w-20 text-right">Ціна за 1 шт, грн</th>
                <th colSpan={2} className="p-2 border border-gray-300">Залишок на початок</th>
                <th colSpan={2} className="p-2 border border-gray-300">Надходження</th>
                <th colSpan={2} className="p-2 border border-gray-300">Вибуття / Списання</th>
                <th colSpan={2} className="p-2 border border-gray-300">Залишок на кінець</th>
              </tr>
              <tr className="bg-gray-100/80 text-gray-800 font-bold border-b border-gray-300 text-center">
                <th className="p-1.5 border border-gray-300 w-16">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-16">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-16">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
                <th className="p-1.5 border border-gray-300 w-16">К-сть</th>
                <th className="p-1.5 border border-gray-300 w-24">Сума, грн</th>
              </tr>
              <tr className="bg-gray-200/60 text-gray-500 text-[10px] text-center font-mono">
                <th className="p-1 border border-gray-300">1</th>
                <th className="p-1 border border-gray-300">2</th>
                <th className="p-1 border border-gray-300">3</th>
                <th className="p-1 border border-gray-300">4</th>
                <th className="p-1 border border-gray-300">5</th>
                <th className="p-1 border border-gray-300">6</th>
                <th className="p-1 border border-gray-300">7</th>
                <th className="p-1 border border-gray-300">8</th>
                <th className="p-1 border border-gray-300">9</th>
                <th className="p-1 border border-gray-300">10</th>
                <th className="p-1 border border-gray-300">11</th>
                <th className="p-1 border border-gray-300">12</th>
                <th className="p-1 border border-gray-300">13</th>
                <th className="p-1 border border-gray-300">14</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleData.map((row, index) => (
                <tr key={row.id} className="hover:bg-warm-50/50">
                  <td className="p-2 border border-gray-200 text-center font-mono text-gray-500">{index + 1}</td>
                  <td className="p-2 border border-gray-200 font-mono font-bold text-center text-warm-800">{row.inventoryNumber}</td>
                  <td className="p-2 border border-gray-200 font-bold text-gray-900">{row.name}</td>
                  <td className="p-2 border border-gray-200 text-gray-600">{row.category}</td>
                  <td className="p-2 border border-gray-200 text-gray-700">{row.placement}</td>
                  <td className="p-2 border border-gray-200 text-right font-semibold text-gray-700">{formatMoneyValue(row.unitPrice)}</td>
                  <td className="p-2 border border-gray-200 text-center font-medium text-gray-700">{row.startQty || '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-semibold text-gray-800">{row.startSum ? formatMoneyValue(row.startSum) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-center font-medium text-emerald-700">{row.inQty || '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold text-emerald-800">{row.inSum ? formatMoneyValue(row.inSum) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-center font-medium text-rose-700">{row.outQty || '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold text-rose-800">{row.outSum ? formatMoneyValue(row.outSum) : '—'}</td>
                  <td className="p-2 border border-gray-200 text-center font-black text-gray-900">{row.endQty || '—'}</td>
                  <td className="p-2 border border-gray-200 text-right font-black text-warm-900">{formatMoneyValue(row.endSum)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black text-gray-900 uppercase">
                <td colSpan={7} className="p-2.5 border border-gray-300 text-right">
                  ВСЬОГО ЗА ЗВІТОМ:
                </td>
                <td className="p-2.5 border border-gray-300 text-right text-gray-900">{formatMoneyValue(totalStartSum)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-emerald-800">{formatMoneyValue(totalInSum)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-rose-800">{formatMoneyValue(totalOutSum)}</td>
                <td className="p-2.5 border border-gray-300"></td>
                <td className="p-2.5 border border-gray-300 text-right text-warm-900">{formatMoneyValue(totalEndSum)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }

      case 'children':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b">Група</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Дата народження</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.fullName}</td>
                  <td className="p-3 text-gray-600 font-bold">{row.groupName || '—'}</td>
                  <td className="p-3 text-center text-gray-500">{new Date(row.birthDate).toLocaleDateString('uk-UA')}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.status === 'active' ? 'Активна' : 'Архів'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'sick':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b">Діагноз</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Дата початку</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Прогноз / Стан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.childName}</td>
                  <td className="p-3 text-red-600 font-bold">{row.diagnosis}</td>
                  <td className="p-3 text-center text-gray-500">{new Date(row.startDate).toLocaleDateString('uk-UA')}</td>
                  <td className="p-3 text-center font-bold text-gray-700">
                    {row.endDate ? new Date(row.endDate).toLocaleDateString('uk-UA') : 'Хворіє'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'attendance':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Всього днів</th>
                <th className="p-3 font-bold text-green-600 border-b text-center">Присутній (+)</th>
                <th className="p-3 font-bold text-red-600 border-b text-center">Відсутній (-)</th>
                <th className="p-3 font-bold text-gray-800 border-b text-center">% відвідування</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.name}</td>
                  <td className="p-3 text-center font-bold text-gray-700">{row.total}</td>
                  <td className="p-3 text-center font-bold text-green-600">{row.present}</td>
                  <td className="p-3 text-center font-bold text-red-600">{row.absent}</td>
                  <td className="p-3 text-center font-black text-gray-800">
                    {row.total ? ((row.present / row.total) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'psychology':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Дитина</th>
                <th className="p-3 font-bold text-gray-600 border-b">Тип роботи</th>
                <th className="p-3 font-bold text-gray-600 border-b">Тема / Результат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.childName || 'Загальна'}</td>
                  <td className="p-3 font-bold text-orange-600 uppercase text-[10px]">{row.type}</td>
                  <td className="p-3 text-gray-600 font-medium">
                    <div className="font-bold text-gray-800">{row.topic}</div>
                    <div className="text-xs opacity-70 italic">{row.notes}</div>
                  </td>
                  <td className="p-3 text-right text-gray-500 font-bold">{new Date(row.date).toLocaleDateString('uk-UA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'spent-products': {
        const grandTotalCost = visibleData.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Найменування продукту</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Використано (К-сть)</th>
                <th className="p-3 font-bold text-gray-600 border-b">Одиниці</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Загальна вартість</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.name}</td>
                  <td className="p-3 text-center font-bold text-red-600">{Number(row.totalQuantity || 0).toFixed(3)}</td>
                  <td className="p-3 text-gray-500">{row.unit}</td>
                  <td className="p-3 text-right font-black text-gray-800">{formatMoneyValue(row.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black text-gray-900 uppercase">
                <td colSpan={4} className="p-3 text-right">РАЗОМ ВИКОРИСТАНО НА СУМУ:</td>
                <td className="p-3 text-right text-gray-900">{formatMoneyValue(grandTotalCost)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }

      case 'spent-medications':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Препарат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">К-сть</th>
                <th className="p-3 font-bold text-gray-600 border-b">Для кого / Причина</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">{row.medName}</td>
                  <td className="p-3 text-center font-bold text-red-600">{row.quantity} {row.unit}</td>
                  <td className="p-3 text-gray-600">
                    <div className="font-bold">{row.childName || 'Загальне'}</div>
                    <div className="text-xs">{row.reason}</div>
                  </td>
                  <td className="p-3 text-right text-gray-500">{new Date(row.date).toLocaleDateString('uk-UA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'utilities': {
        const totalUtilCost = visibleData.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Лічильник</th>
                <th className="p-3 font-bold text-gray-600 border-b">Тип / Од.</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Початкові показання</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Кінцеві показання</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Спожито</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Тариф</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Сума</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-black text-gray-800">
                    <div>{row.meterName}</div>
                    <div className="text-[10px] font-medium text-gray-400">{row.location || 'Без локації'}</div>
                  </td>
                  <td className="p-3 text-gray-600">
                    <div className="font-bold">{row.utilityType}</div>
                    <div className="text-xs">{row.unit}</div>
                  </td>
                  <td className="p-3 text-right font-semibold text-gray-500">{row.startReading ?? '—'}</td>
                  <td className="p-3 text-right font-semibold text-gray-700">{row.endReading ?? '—'}</td>
                  <td className="p-3 text-right font-black text-warm-600">{Number(row.consumption || 0).toFixed(3)} {row.unit}</td>
                  <td className="p-3 text-right text-gray-600">
                    {row.tariffPrice !== null && row.tariffPrice !== undefined
                      ? `${Number(row.tariffPrice).toFixed(4)} грн`
                      : '—'}
                  </td>
                  <td className="p-3 text-right font-black text-gray-800">{formatMoneyValue(row.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black text-gray-900 uppercase">
                <td colSpan={7} className="p-3 text-right">РАЗОМ ДО СТРАТИ:</td>
                <td className="p-3 text-right text-gray-900">{formatMoneyValue(totalUtilCost)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }

      case 'audit':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_time')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_user')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_action')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_entity')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_details')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-semibold text-gray-700 whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleString('uk-UA')}
                  </td>
                  <td className="p-3 text-gray-700">
                    <div className="font-bold">{row.userFullName || t('audit_system_user')}</div>
                    <div className="text-xs text-gray-400">{row.username || '—'}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-lg bg-warm-50 px-2 py-1 text-[10px] font-black uppercase text-warm-700">
                      {String(row.actionType).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">
                    <div className="font-bold">{row.entity}</div>
                    <div className="text-xs text-gray-400">{t('audit_id')}: {row.entityId ?? '—'}</div>
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    <div className="max-w-[420px] whitespace-pre-wrap break-words">
                      {formatAuditDetails(row)}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{row.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'detailed-menus':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Дата</th>
                <th className="p-3 font-bold text-gray-600 border-b">Прийом їжі</th>
                <th className="p-3 font-bold text-gray-600 border-b">Страва / вихід</th>
                <th className="p-3 font-bold text-gray-600 border-b">Інгредієнт</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">На 1 дит. 0–4, г</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">На 1 дит. 5–7, г</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">На 1 співр., г</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Разом, г</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.flatMap((row, rowIndex) => {
                const ingredients = getDetailedMenuIngredients(row);
                return ingredients.map((ingredient, ingredientIndex) => (
                  <tr key={`${row.id ?? rowIndex}-${ingredient.productName}-${ingredientIndex}`}>
                    {ingredientIndex === 0 && (
                      <>
                        <td rowSpan={ingredients.length} className="p-3 align-top font-bold text-gray-800 whitespace-nowrap print:hidden">{formatDate(row.date)}</td>
                        <td rowSpan={ingredients.length} className="p-3 align-top font-bold text-warm-700 print:hidden">{formatMealType(row.mealTypeLabel || row.mealType)}</td>
                        <td rowSpan={ingredients.length} className="p-3 align-top text-gray-700 print:hidden">
                          <div className="font-black">{row.dishName}</div>
                          <div className="mt-1 text-[10px] font-semibold text-gray-400">
                            Вихід: {formatGrams(row.outputWeight0_4)} / {formatGrams(row.outputWeight5_7)} / {formatGrams(row.outputWeightEmployees)} г
                          </div>
                        </td>
                      </>
                    )}
                    <td className="hidden p-3 font-bold text-gray-800 whitespace-nowrap print:table-cell">{formatDate(row.date)}</td>
                    <td className="hidden p-3 font-bold text-gray-800 print:table-cell">{formatMealType(row.mealTypeLabel || row.mealType)}</td>
                    <td className="hidden p-3 text-gray-700 print:table-cell">
                      <div className="font-bold">{row.dishName}</div>
                      <div>Вихід: {formatGrams(row.outputWeight0_4)} / {formatGrams(row.outputWeight5_7)} / {formatGrams(row.outputWeightEmployees)} г</div>
                    </td>
                    <td className="p-3 font-semibold text-gray-700">{ingredient.productName}</td>
                    <td className="p-3 text-right font-bold text-gray-600">{formatGrams(ingredient.gramsPerPerson0_4)}</td>
                    <td className="p-3 text-right font-bold text-gray-600">{formatGrams(ingredient.gramsPerPerson5_7)}</td>
                    <td className="p-3 text-right font-bold text-gray-600">{formatGrams(ingredient.gramsPerEmployee)}</td>
                    <td className="p-3 text-right font-black text-gray-800">{formatGrams(ingredient.totalGrams)}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        );

      case 'medications':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Препарат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Залишок</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Термін придатності</th>
                <th className="p-3 font-bold text-gray-600 border-b">Примітки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => {
                const isLow = Number(row.quantity || 0) <= 0;
                const isExpired = row.expiryDate && new Date(row.expiryDate).getTime() < Date.now();

                return (
                  <tr key={row.id}>
                    <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-gray-800">{row.name}</td>
                    <td className={`p-3 text-right font-black ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(row.quantity || 0).toFixed(2)} {row.unit}
                    </td>
                    <td className={`p-3 text-center font-semibold ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                      {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('uk-UA') : '—'}
                    </td>
                    <td className="p-3 text-gray-600">{row.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );

      case 'tmc': {
        const totalTmcVal = visibleData.reduce((sum, r) => sum + (r.initialValue || 0), 0);
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Інвентарний №</th>
                <th className="p-3 font-bold text-gray-600 border-b">Найменування</th>
                <th className="p-3 font-bold text-gray-600 border-b">Категорія</th>
                <th className="p-3 font-bold text-gray-600 border-b">Локація</th>
                <th className="p-3 font-bold text-gray-600 border-b">Прив’язка</th>
                <th className="p-3 font-bold text-gray-600 border-b">Стан</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Первісна вартість</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-mono font-bold text-warm-800">{row.inventoryNumber}</td>
                  <td className="p-3">
                    <div className="font-bold text-gray-800">{row.name}</div>
                    <div className="text-xs text-gray-400">
                      {row.arrivalDate ? new Date(row.arrivalDate).toLocaleDateString('uk-UA') : 'Без дати надходження'}
                    </div>
                  </td>
                  <td className="p-3 text-gray-700">{row.category || '—'}</td>
                  <td className="p-3 text-gray-700">{row.location || row.outdoorArea || '—'}</td>
                  <td className="p-3 text-gray-700">{formatAssignmentLabel(row)}</td>
                  <td className="p-3">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-600">
                      {formatInventoryStatus(row.status)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-800">
                    {row.initialValue !== null && row.initialValue !== undefined ? formatMoneyValue(row.initialValue) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-black text-gray-900 uppercase">
                <td colSpan={7} className="p-3 text-right">ЗАГАЛЬНА ПЕРВІСНА ВАРТІСТЬ:</td>
                <td className="p-3 text-right text-gray-900">{formatMoneyValue(totalTmcVal)}</td>
              </tr>
            </tfoot>
          </table>
        );
      }

      case 'menus':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b w-10 text-center">№</th>
                <th className="p-3 font-bold text-gray-600 border-b">Дата</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">0-4</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">5-7</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Співробітники</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Разом</th>
                <th className="p-3 font-bold text-gray-600 border-b">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleData.map((row, idx) => (
                <tr key={row.id}>
                  <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-bold text-gray-800">{new Date(row.date).toLocaleDateString('uk-UA')}</td>
                  <td className="p-3 text-right font-semibold text-gray-600">{row.count0_4 ?? '—'}</td>
                  <td className="p-3 text-right font-semibold text-gray-600">{row.count5_7 ?? '—'}</td>
                  <td className="p-3 text-right font-semibold text-gray-600">{row.employeesCount ?? '0'}</td>
                  <td className="p-3 text-right font-black text-gray-800">{(row.count0_4 ?? 0) + (row.count5_7 ?? 0) + (row.employeesCount ?? 0)}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
                        row.status === 'Затверджено'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  const getReportTitle = () => {
    let title = reportTitles[reportType] || t('reports');
    if (needsDateFilter) {
      title += ` (${new Date(startDate).toLocaleDateString('uk-UA')} — ${new Date(endDate).toLocaleDateString('uk-UA')})`;
    }
    return title;
  };

  return (
    <div className="space-y-6">
      {/* Контрольна панель (не друкується) */}
      <div className="print:hidden bg-white p-6 rounded-3xl shadow-sm border border-warm-100 flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-warm-500" />
              {t('reports_generator')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Сформуйте, перевірте та підготуйте офіційну звітність до друку або експорту.</p>
          </div>
          {canPrintReports && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleExport()}
                disabled={exporting || loading || visibleData.length === 0}
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 border border-emerald-200"
              >
                <Download size={18} /> {exporting ? 'Експорт...' : t('reports_export_excel')}
              </button>
              <button onClick={handlePrint} disabled={loading || visibleData.length === 0} className="bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 border border-blue-200">
                <Printer size={18} /> {t('reports_print')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-96">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{t('reports_type')}</label>
            <CustomSelect 
              options={reportOptions}
              value={reportType}
              onChange={(value) => {
                setSearchQuery('');
                setReportType(value as ReportType);
              }}
            />
          </div>
          
          {needsDateFilter && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('reports_start_date')}</label>
                <input 
                  type="date" 
                  className="ui-input bg-gray-50 border-gray-200"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('reports_end_date')}</label>
                <input 
                  type="date" 
                  className="ui-input bg-gray-50 border-gray-200"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <button onClick={generateReport} className="ui-button-primary px-6 h-11 flex items-center gap-2 bg-warm-600">
            <Filter size={18} />
            Сформувати звіт
          </button>
        </div>

        {needsDateFilter && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
              <CalendarDays size={15} /> Швидкий період
            </span>
            <button type="button" onClick={() => setPeriod('month')} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-warm-50 hover:text-warm-700">Поточний місяць</button>
            <button type="button" onClick={() => setPeriod('previous-month')} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-warm-50 hover:text-warm-700">Минулий місяць</button>
            <button type="button" onClick={() => setPeriod('year')} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-warm-50 hover:text-warm-700">Поточний рік</button>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      <div className="print:hidden flex flex-col gap-3 rounded-2xl border border-warm-100 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-2 font-bold text-gray-700"><Rows3 size={17} className="text-warm-500" /> Записів у звіті: {visibleData.length}</span>
          {searchQuery && visibleData.length !== data.length && <span className="text-gray-400">із {data.length}</span>}
          <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">{isWideReport ? 'Альбомний друк (A4 landscape)' : 'Книжковий друк (A4 portrait)'}</span>
        </div>
        <label className="relative block w-full lg:w-80">
          <span className="sr-only">Пошук у звіті</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Пошук у сформованому звіті"
            className="ui-input w-full bg-white pl-10 pr-10"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Очистити пошук" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      {/* Зона друку державних форм */}
      <div className={`report-document bg-white p-8 rounded-[2.5rem] shadow-sm border border-warm-100 print:shadow-none print:border-none print:p-0 min-h-[70vh] ${isWideReport ? 'report-landscape' : 'report-portrait'}`}>
        <div className="report-header mb-6 border-b-2 border-gray-900 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-gray-900">{settings?.name || 'Заклад дошкільної освіти'}</div>
              <div className="mt-0.5 text-xs text-gray-600">
                Код ЄДРПОУ: <span className="font-bold text-gray-900">{settings?.edrpou || '—'}</span>{settings?.address ? ` · ${settings.address}` : ''}
              </div>
            </div>
            <div className="text-right text-xs text-gray-800 font-bold border border-gray-400 p-2.5 rounded-lg bg-gray-50/50 print:border-black">
              <div>ЗАТВЕРДЖУЮ</div>
              <div className="mt-1 text-[11px] font-normal">Керівник ЗДО ___________________</div>
              <div className="mt-1 text-[10px] text-gray-500 font-normal">«____» _______________ 20___ р.</div>
            </div>
          </div>
          <div className="text-center mt-4">
            <h2 className="mx-auto max-w-4xl text-xl font-black leading-tight text-gray-900 uppercase tracking-tight">{getReportTitle()}</h2>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 border-t border-gray-200 pt-2">
            <span>{t('reports_generated_at')}: <strong>{generatedAt?.toLocaleString('uk-UA') || '—'}</strong></span>
            <span>Кількість позицій у звіті: <strong>{visibleData.length}</strong></span>
          </div>
        </div>
        
        <div className="report-table-wrap overflow-x-auto print:overflow-visible">
          {renderTable()}
        </div>

        <div className="mt-12 hidden print:grid grid-cols-3 gap-6 border-t border-gray-800 pt-8 text-xs text-gray-900">
          <div className="text-center">
            <div className="border-b border-gray-800 mb-1.5 h-7"></div>
            <div className="font-bold uppercase text-[10px]">{t('reports_responsible_person')}</div>
            <div className="text-[9px] text-gray-500">(підпис, ініціали, прізвище)</div>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-800 mb-1.5 h-7"></div>
            <div className="font-bold uppercase text-[10px]">Головний бухгалтер</div>
            <div className="text-[9px] text-gray-500">(підпис, ініціали, прізвище)</div>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-800 mb-1.5 h-7"></div>
            <div className="font-bold uppercase text-[10px]">{t('reports_head')}</div>
            <div className="text-[9px] text-gray-500">(підпис, ініціали, прізвище)</div>
          </div>
        </div>
      </div>

      <style>{`
        .report-table-wrap thead th { position: sticky; top: 0; z-index: 1; background: #f8fafc; }
        .report-table-wrap tbody tr:nth-child(even) { background: #fafafa; }
        .report-table-wrap tbody tr:hover { background: #fff7ed; }
        @media print {
          @page { size: ${isWideReport ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm 8mm 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; font-family: 'Times New Roman', Times, serif; }
          .print\\:hidden { display: none !important; }
          .report-document { min-height: 0 !important; width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .report-header { break-after: avoid; page-break-after: avoid; }
          .report-table-wrap table { width: 100% !important; table-layout: auto; border-collapse: collapse; }
          .report-table-wrap thead { display: table-header-group; }
          .report-table-wrap tfoot { display: table-footer-group; }
          .report-table-wrap tr { break-inside: avoid; page-break-inside: avoid; }
          .report-table-wrap th, .report-table-wrap td { padding: 4px 5px !important; border: 1px solid #000 !important; color: #000 !important; font-size: ${isWideReport ? '8pt' : '8.5pt'} !important; }
          .report-table-wrap thead th { position: static; background: #f3f4f6 !important; }
          .report-table-wrap tbody tr:nth-child(even) { background: #fff !important; }
          .report-table-wrap td div { max-width: none !important; }
        }
      `}</style>
    </div>
  );
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('uk-UA') : '—';

const formatMoneyValue = (value?: number | null) =>
  value === null || value === undefined
    ? '0.00 грн'
    : new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) + ' грн';

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  snack: 'Полуденок',
  dinner: 'Вечеря',
};

const formatMealType = (value?: string | null) => value ? mealTypeLabels[value] ?? value : '—';

const formatGrams = (value?: number | null) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(Number(value));

const getDetailedMenuIngredients = (row: ReportRow): ReportRow[] =>
  Array.isArray(row.ingredients) && row.ingredients.length > 0
    ? row.ingredients
    : [{ productName: 'Склад рецепта не заповнено' }];

const getExportRows = (reportType: ReportType, rows: ReportRow[]) => {
  if (reportType === 'detailed-menus') {
    return rows.flatMap((row) => getDetailedMenuIngredients(row).map((ingredient) => ({
      'Дата': formatDate(row.date),
      'Прийом їжі': formatMealType(row.mealTypeLabel || row.mealType),
      'Назва страви': row.dishName,
      'Вихід 0–4, г': Number(row.outputWeight0_4 || 0),
      'Вихід 5–7, г': Number(row.outputWeight5_7 || 0),
      'Вихід співробітники, г': Number(row.outputWeightEmployees || 0),
      'Інгредієнт': ingredient.productName,
      'На 1 дитину 0–4, г': ingredient.gramsPerPerson0_4 ?? '—',
      'На 1 дитину 5–7, г': ingredient.gramsPerPerson5_7 ?? '—',
      'На 1 співробітника, г': ingredient.gramsPerEmployee ?? '—',
      'Разом, г': ingredient.totalGrams ?? '—',
    })));
  }

  return rows.map((row, index) => {
    switch (reportType) {
      case 'saldo':
        return {
          '№ з/п': index + 1,
          'Продукт харчування': row.name,
          'Од. вим.': row.unit,
          'Ціна (грн)': row.price,
          'Початковий залишок (к-сть)': Number(row.startStock || 0),
          'Початковий залишок (сума грн)': Number(row.startCost || 0),
          'Прихід (к-сть)': Number(row.incoming || 0),
          'Прихід (сума грн)': Number(row.incomingCost || 0),
          'Видаток (к-сть)': Number(row.outgoing || 0),
          'Видаток (сума грн)': Number(row.outgoingCost || 0),
          'Кінцевий залишок (к-сть)': Number(row.endStock || 0),
          'Кінцевий залишок (сума грн)': Number(row.endCost || 0),
        };
      case 'tmc-saldo':
        return {
          '№ з/п': index + 1,
          'Інв. №': row.inventoryNumber,
          'Найменування майна / ТМЦ': row.name,
          'Категорія': row.category,
          'Прив’язка / Локація': row.placement,
          'Ціна за 1 шт (грн)': row.unitPrice,
          'Початковий залишок (к-сть)': row.startQty,
          'Початковий залишок (сума грн)': row.startSum,
          'Надходження (к-сть)': row.inQty,
          'Надходження (сума грн)': row.inSum,
          'Списання/Переміщення (к-сть)': row.outQty,
          'Списання/Переміщення (сума грн)': row.outSum,
          'Кінцевий залишок (к-сть)': row.endQty,
          'Кінцевий залишок (сума грн)': row.endSum,
        };
      case 'children':
        return { '№ з/п': index + 1, 'ПІБ дитини': row.fullName, 'Група': row.groupName || '—', 'Дата народження': formatDate(row.birthDate), 'Статус': row.status === 'active' ? 'Активна' : 'Архів' };
      case 'sick':
        return { '№ з/п': index + 1, 'ПІБ дитини': row.childName, 'Діагноз': row.diagnosis, 'Дата початку': formatDate(row.startDate), 'Прогноз': row.endDate ? formatDate(row.endDate) : 'Хворіє' };
      case 'attendance':
        return { '№ з/п': index + 1, 'ПІБ дитини': row.name, 'Всього днів': row.total, 'Присутній': row.present, 'Відсутній': row.absent, 'Відвідування, %': row.total ? Number(((row.present / row.total) * 100).toFixed(1)) : 0 };
      case 'psychology':
        return { '№ з/п': index + 1, 'Дитина': row.childName || 'Загальна', 'Тип роботи': row.type, 'Тема': row.topic, 'Результат / примітки': row.notes || '—', 'Дата': formatDate(row.date) };
      case 'spent-products':
        return { '№ з/п': index + 1, 'Найменування продукту': row.name, 'Використано': Number(row.totalQuantity || 0), 'Одиниця': row.unit, 'Загальна вартість, грн': Number(row.totalCost || 0) };
      case 'spent-medications':
        return { '№ з/п': index + 1, 'Препарат': row.medName, 'Кількість': row.quantity, 'Одиниця': row.unit, 'Для кого': row.childName || 'Загальне', 'Причина': row.reason || '—', 'Дата': formatDate(row.date) };
      case 'utilities':
        return { '№ з/п': index + 1, 'Лічильник': row.meterName, 'Локація': row.location || '—', 'Тип': row.utilityType, 'Одиниця': row.unit, 'Початкові показання': row.startReading ?? '—', 'Кінцеві показання': row.endReading ?? '—', 'Спожито': Number(row.consumption || 0), 'Тариф, грн': row.tariffPrice ?? '—', 'Сума, грн': Number(row.estimatedCost || 0) };
      case 'audit':
        return { '№ з/п': index + 1, 'Час': new Date(row.timestamp).toLocaleString('uk-UA'), 'Користувач': row.userFullName || row.username || 'Система', 'Дія': String(row.actionType).replace(/_/g, ' '), 'Сутність': row.entity, 'ID': row.entityId ?? '—', 'Деталі': formatAuditDetails(row), 'IP-адреса': row.ipAddress || '—' };
      case 'medications':
        return { '№ з/п': index + 1, 'Препарат': row.name, 'Залишок': Number(row.quantity || 0), 'Одиниця': row.unit, 'Термін придатності': formatDate(row.expiryDate), 'Примітки': row.notes || '—' };
      case 'tmc':
        return { '№ з/п': index + 1, 'Інвентарний №': row.inventoryNumber, 'Найменування': row.name, 'Дата надходження': formatDate(row.arrivalDate), 'Категорія': row.category || '—', 'Локація': row.location || row.outdoorArea || '—', 'Прив’язка': formatAssignmentLabel(row), 'Стан': formatInventoryStatus(row.status), 'Первісна вартість, грн': row.initialValue ?? '—' };
      case 'menus':
        return { '№ з/п': index + 1, 'Дата': formatDate(row.date), 'Діти 0–4': row.count0_4 ?? 0, 'Діти 5–7': row.count5_7 ?? 0, 'Співробітники': row.employeesCount ?? 0, 'Разом': (row.count0_4 ?? 0) + (row.count5_7 ?? 0) + (row.employeesCount ?? 0), 'Статус': row.status };
      default:
        return row;
    }
  });
};

const getWorksheetWidths = (worksheet: Record<string, unknown>) => {
  const rows = Object.values(worksheet)
    .filter((cell): cell is { v: unknown } => cell !== null && typeof cell === 'object' && 'v' in cell)
    .map((cell) => String(cell.v));
  const range = typeof worksheet['!ref'] === 'string' ? worksheet['!ref'] : '';
  if (!range || rows.length === 0) return [];
  const columnCount = range.split(':')[1].replace(/\d/g, '').split('').reduce((total: number, char: string) => total * 26 + char.charCodeAt(0) - 64, 0);
  return Array.from({ length: columnCount }, (_, columnIndex) => ({
    wch: Math.min(45, Math.max(12, ...rows.filter((_, index) => index % columnCount === columnIndex).map((value) => value.length + 2))),
  }));
};

const formatAssignmentLabel = (row: ReportRow) => {
  switch (row.assignmentType) {
    case 'employee':
      return row.employeeName || 'Співробітник не вказаний';
    case 'group':
      return row.groupName ? `Група: ${row.groupName}` : 'Група не вказана';
    case 'outdoor':
      return row.outdoorArea ? `Територія: ${row.outdoorArea}` : 'Територія садка';
    case 'storage':
      return row.location ? `Склад: ${row.location}` : 'Склад';
    default:
      return row.location || 'Без прив’язки';
  }
};

const formatInventoryStatus = (status?: string | null) => {
  switch (status) {
    case 'good':
      return 'Справне';
    case 'needs-repair':
      return 'Потребує ремонту';
    case 'written-off':
      return 'Списане';
    default:
      return status || 'Не вказано';
  }
};

const formatAuditDetails = (row: ReportRow) => {
  const newValue = row.newValue ? JSON.stringify(row.newValue, null, 2) : '';
  const oldValue = row.oldValue ? JSON.stringify(row.oldValue, null, 2) : '';

  if (oldValue && newValue) {
    return `Було:\n${oldValue}\n\nСтало:\n${newValue}`;
  }

  if (newValue) {
    return newValue;
  }

  if (oldValue) {
    return oldValue;
  }

  return '—';
};

export default ReportsPage;
