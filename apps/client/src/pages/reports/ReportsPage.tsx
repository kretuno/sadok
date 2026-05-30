import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Printer, Download, Filter } from 'lucide-react';
import api from '../../api/axios';
import { useSettings } from '../../contexts/SettingsContext';
import CustomSelect from '../../components/ui/CustomSelect';

type ReportType = 
  | 'saldo' 
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

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [reportType, setReportType] = useState<ReportType>('saldo');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reportOptions = [
    { id: 'saldo', name: t('report_saldo') },
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
    'saldo', 'menus', 'detailed-menus', 'psychology', 
    'attendance', 'spent-products', 'spent-medications', 'utilities', 'audit'
  ].includes(reportType);

  useEffect(() => {
    generateReport();
  }, [reportType, startDate, endDate]);

  const generateReport = async () => {
    setLoading(true);
    try {
      let endpoint = `/reports/${reportType}`;
      if (needsDateFilter) {
        endpoint +=`?start=${startDate}&end=${endDate}`;
      }

      const res = await api.get(endpoint);
      setData(res.data);
    } catch (e) {
      console.error('Не вдалося завантажити звіт', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports_sheet_name'));
      XLSX.writeFile(wb, `Звіт_${reportType}_${new Date().toLocaleDateString('uk-UA')}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const renderTable = () => {
    if (loading) return <div className="p-10 text-center font-bold text-gray-400">{t('reports_loading')}</div>;
    if (!data || data.length === 0) return <div className="p-10 text-center text-gray-400 animate-pulse">{t('reports_empty')}</div>;

    switch (reportType) {
      case 'saldo':
        return (
          <table className="w-full text-left text-sm print:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Продукт</th>
                <th className="p-3 font-bold text-gray-600 border-b">Од.</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Початковий залишок</th>
                <th className="p-3 font-bold text-green-600 border-b text-right">Прихід</th>
                <th className="p-3 font-bold text-red-600 border-b text-right">Видаток</th>
                <th className="p-3 font-bold text-gray-800 border-b text-right">Кінцевий залишок</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
                  <td className="p-3 font-bold text-gray-800">{row.name}</td>
                  <td className="p-3 text-gray-500">{row.unit}</td>
                  <td className="p-3 font-semibold text-right text-gray-600">{Number(row.startStock || 0).toFixed(2)}</td>
                  <td className="p-3 font-bold text-right text-green-600">{Number(row.incoming || 0) > 0 ? `+${Number(row.incoming || 0).toFixed(2)}` : '0.00'}</td>
                  <td className="p-3 font-bold text-right text-red-600">{Number(row.outgoing || 0) > 0 ? `-${Number(row.outgoing || 0).toFixed(2)}` : '0.00'}</td>
                  <td className="p-3 font-black text-right text-gray-800">{Number(row.endStock || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'children':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b">Група</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Дата народження</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b">Діагноз</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Дата початку</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Прогноз</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">ПІБ Дитини</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Всього днів</th>
                <th className="p-3 font-bold text-green-600 border-b text-center">Присутній (+)</th>
                <th className="p-3 font-bold text-red-600 border-b text-center">Відсутній (-)</th>
                <th className="p-3 font-bold text-gray-800 border-b text-center">% відвідування</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-3 font-black text-gray-800">{row.name}</td>
                  <td className="p-3 text-center font-bold text-gray-400">{row.total}</td>
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
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Дитина</th>
                <th className="p-3 font-bold text-gray-600 border-b">Тип роботи</th>
                <th className="p-3 font-bold text-gray-600 border-b">Тема / Результат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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

      case 'spent-products':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Найменування продукту</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Використано (К-сть)</th>
                <th className="p-3 font-bold text-gray-600 border-b">Одиниці</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Загальна вартість</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
                  <td className="p-3 font-black text-gray-800">{row.name}</td>
                  <td className="p-3 text-center font-bold text-red-600">{Number(row.totalQuantity || 0).toFixed(3)}</td>
                  <td className="p-3 text-gray-500">{row.unit}</td>
                  <td className="p-3 text-right font-black text-gray-800">{row.totalCost?.toFixed(2) || '0.00'} грн</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'spent-medications':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Препарат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">К-сть</th>
                <th className="p-3 font-bold text-gray-600 border-b">Для кого / Причина</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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

      case 'utilities':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
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
              {data.map((row: any) => (
                <tr key={row.id}>
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
                  <td className="p-3 text-right font-black text-gray-800">{Number(row.estimatedCost || 0).toFixed(2)} грн</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'audit':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_time')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_user')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_action')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_entity')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_details')}</th>
                <th className="p-3 font-bold text-gray-600 border-b">{t('audit_ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Дата</th>
                <th className="p-3 font-bold text-gray-600 border-b">Прийом їжі</th>
                <th className="p-3 font-bold text-gray-600 border-b">Назва страви</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Дітей / співр. (0-4 / 5-7 / співр.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-3 font-bold text-gray-800">{new Date(row.date).toLocaleDateString('uk-UA')}</td>
                  <td className="p-3 text-warm-600 font-bold uppercase text-[10px]">{row.mealType}</td>
                  <td className="p-3 font-black text-gray-700">{row.dishName}</td>
                  <td className="p-3 text-right font-bold text-gray-500">{row.count0_4} / {row.count5_7} / {row.countEmployees ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'medications':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Препарат</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Залишок</th>
                <th className="p-3 font-bold text-gray-600 border-b text-center">Термін придатності</th>
                <th className="p-3 font-bold text-gray-600 border-b">Примітки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => {
                const isLow = Number(row.quantity || 0) <= 0;
                const isExpired = row.expiryDate && new Date(row.expiryDate).getTime() < Date.now();

                return (
                  <tr key={row.id}>
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

      case 'tmc':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
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
              {data.map((row: any) => (
                <tr key={row.id}>
                  <td className="p-3 font-mono text-gray-500">{row.inventoryNumber}</td>
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
                    {row.initialValue !== null && row.initialValue !== undefined ? `${Number(row.initialValue).toFixed(2)} грн` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'menus':
        return (
          <table className="w-full text-left text-sm print:text-xs">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="p-3 font-bold text-gray-600 border-b">Дата</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">0-4</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">5-7</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Співробітники</th>
                <th className="p-3 font-bold text-gray-600 border-b text-right">Разом</th>
                <th className="p-3 font-bold text-gray-600 border-b">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row: any) => (
                <tr key={row.id}>
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-warm-500" />
            {t('reports_generator')}
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 border border-emerald-200"
            >
              <Download size={18} /> {exporting ? 'Експорт...' : t('reports_export_excel')}
            </button>
            <button onClick={handlePrint} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 border border-blue-200">
              <Printer size={18} /> {t('reports_print')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-80">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{t('reports_type')}</label>
            <CustomSelect 
              options={reportOptions}
              value={reportType}
              onChange={(value) => setReportType(value as ReportType)}
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
            {t('reports_refresh')}
          </button>
        </div>
      </div>

      {/* Зона друку */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-warm-100 print:shadow-none print:border-none print:p-0 min-h-[70vh]">
        <div className="mb-8 border-b-4 border-gray-900 pb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">{getReportTitle()}</h2>
            <div className="text-gray-500 text-sm mt-3 font-bold uppercase tracking-widest">
              {settings?.name || 'Заклад дошкільної освіти'} | ЄДРПОУ: {settings?.edrpou || '—'}
            </div>
            <div className="text-gray-400 text-[10px] mt-1 italic">
              {t('reports_generated_at')}: {new Date().toLocaleString('uk-UA')}
            </div>
          </div>
          <div className="text-right">
             <div className="w-16 h-16 bg-warm-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white mb-2 ml-auto">SK</div>
             <div className="text-[10px] font-black uppercase text-warm-600 tracking-tighter">SADOK</div>
          </div>
        </div>
        
        <div className="print:px-2">
          {renderTable()}
        </div>

        <div className="mt-12 hidden print:flex justify-between items-center border-t border-dashed border-gray-300 pt-8">
           <div className="text-center w-48">
              <div className="border-b border-gray-800 mb-1 h-8"></div>
              <div className="text-[10px] font-bold uppercase">{t('reports_responsible_person')}</div>
           </div>
           <div className="text-center w-48">
              <div className="border-b border-gray-800 mb-1 h-8"></div>
              <div className="text-[10px] font-bold uppercase">{t('reports_head')}</div>
           </div>
           <div className="text-center w-48">
              <div className="border-b border-gray-800 mb-1 h-8"></div>
              <div className="text-[10px] font-bold uppercase">{t('reports_stamp')}</div>
           </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 15mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; font-family: 'Montserrat', sans-serif; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const formatAssignmentLabel = (row: any) => {
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

const formatAuditDetails = (row: any) => {
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
