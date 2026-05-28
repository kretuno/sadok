import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Calculator, CheckCircle2, Flame, Gauge, Plus, Waves, Zap, Pencil, Printer } from 'lucide-react';
import api from '../../api/axios';
import CustomSelect from '../../components/ui/CustomSelect';
import { useSettings } from '../../contexts/SettingsContext';

interface UtilityMeter {
  id: number;
  name: string;
  utilityType: string;
  unit: string;
  location?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
  latestReading?: UtilityReading | null;
  previousReading?: UtilityReading | null;
  currentTariff?: UtilityTariff | null;
  lastConsumption?: number | null;
  estimatedCost?: number | null;
}

interface UtilityReading {
  id: number;
  meterId: number;
  meterName?: string;
  utilityType?: string;
  unit?: string;
  readingValue: number;
  readingDate: string;
  notes?: string | null;
}

interface UtilityTariff {
  id: number;
  meterId: number;
  meterName?: string;
  utilityType?: string;
  unit?: string;
  pricePerUnit: number;
  fixedFee: number;
  validFrom: string;
  notes?: string | null;
}

const utilityTypeOptions = [
  { id: 'electricity', name: 'Електроенергія' },
  { id: 'water', name: 'Вода' },
  { id: 'gas', name: 'Газ' },
  { id: 'heating', name: 'Опалення' },
  { id: 'other', name: 'Інше' },
];

const unitOptionsByUtilityType: Record<string, { id: string; name: string }[]> = {
  electricity: [
    { id: 'кВт·год', name: 'кВт·год' },
    { id: 'МВт·год', name: 'МВт·год' },
  ],
  water: [
    { id: 'м3', name: 'м3' },
    { id: 'л', name: 'л' },
  ],
  gas: [
    { id: 'м3', name: 'м3' },
    { id: 'кВт·год', name: 'кВт·год' },
  ],
  heating: [
    { id: 'Гкал', name: 'Гкал' },
    { id: 'кВт·год', name: 'кВт·год' },
    { id: 'м3', name: 'м3' },
  ],
  other: [
    { id: 'од.', name: 'од.' },
    { id: 'шт.', name: 'шт.' },
    { id: 'м3', name: 'м3' },
    { id: 'кВт·год', name: 'кВт·год' },
  ],
};

const defaultMeterForm = {
  name: '',
  utilityType: 'electricity',
  unit: 'кВт·год',
  location: '',
  accountNumber: '',
  notes: '',
  isActive: true,
};

const defaultReadingForm = {
  meterId: '',
  readingValue: '',
  readingDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

const defaultTariffForm = {
  meterId: '',
  pricePerUnit: '',
  fixedFee: '0',
  validFrom: new Date().toISOString().slice(0, 10),
  notes: '',
};

interface MonthlyConsumptionItem {
  monthKey: string;
  label: string;
  total: number;
  utilityType: string;
}

type Notice = {
  type: 'success' | 'error';
  message: string;
};

const UtilitiesPage: React.FC = () => {
  const { settings } = useSettings();
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [tariffs, setTariffs] = useState<UtilityTariff[]>([]);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [editingMeterId, setEditingMeterId] = useState<number | null>(null);
  const [editingTariffId, setEditingTariffId] = useState<number | null>(null);

  const [meterForm, setMeterForm] = useState(defaultMeterForm);
  const [readingForm, setReadingForm] = useState(defaultReadingForm);
  const [tariffForm, setTariffForm] = useState(defaultTariffForm);

  const [savingMeter, setSavingMeter] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [savingTariff, setSavingTariff] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const meterOptions = useMemo(
    () => meters.map((meter) => ({ id: meter.id, name: `${meter.name} (${getUtilityTypeLabel(meter.utilityType)})` })),
    [meters]
  );
  const unitOptions = useMemo(
    () => unitOptionsByUtilityType[meterForm.utilityType] || unitOptionsByUtilityType.other,
    [meterForm.utilityType]
  );

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const [metersRes, readingsRes, tariffsRes] = await Promise.all([
        api.get('/utilities/meters'),
        api.get('/utilities/readings'),
        api.get('/utilities/tariffs'),
      ]);
      setMeters(metersRes.data);
      setReadings(readingsRes.data);
      setTariffs(tariffsRes.data);
    } catch (error) {
      console.error('Помилка завантаження лічильників', error);
      setNotice({ type: 'error', message: 'Не вдалося завантажити дані лічильників' });
    }
  }

  function getUtilityTypeLabel(type: string) {
    return utilityTypeOptions.find((option) => option.id === type)?.name || type;
  }

  function getUtilityTypeIcon(type: string) {
    switch (type) {
      case 'electricity':
        return <Zap size={18} className="text-amber-500" />;
      case 'water':
        return <Waves size={18} className="text-sky-500" />;
      case 'gas':
        return <Flame size={18} className="text-orange-500" />;
      default:
        return <Gauge size={18} className="text-warm-500" />;
    }
  }

  function resetMeterForm() {
    setMeterForm(defaultMeterForm);
    setEditingMeterId(null);
  }

  function resetTariffForm() {
    setTariffForm(defaultTariffForm);
    setEditingTariffId(null);
  }

  async function handleMeterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavingMeter(true);
    setNotice(null);
    try {
      if (editingMeterId) {
        await api.put(`/utilities/meters/${editingMeterId}`, meterForm);
      } else {
        await api.post('/utilities/meters', meterForm);
      }
      resetMeterForm();
      await loadData();
      setNotice({ type: 'success', message: editingMeterId ? 'Лічильник оновлено' : 'Лічильник збережено' });
    } catch (error) {
      console.error('Помилка збереження лічильника', error);
      setNotice({ type: 'error', message: 'Не вдалося зберегти лічильник' });
    } finally {
      setSavingMeter(false);
    }
  }

  async function handleReadingSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavingReading(true);
    setNotice(null);
    try {
      await api.post('/utilities/readings', {
        meterId: Number(readingForm.meterId),
        readingValue: Number(readingForm.readingValue),
        readingDate: readingForm.readingDate,
        notes: readingForm.notes,
      });
      setReadingForm(defaultReadingForm);
      await loadData();
      setNotice({ type: 'success', message: 'Показання додано' });
    } catch (error: any) {
      console.error('Помилка додавання показання', error);
      setNotice({ type: 'error', message: error?.response?.data?.message || 'Не вдалося додати показання' });
    } finally {
      setSavingReading(false);
    }
  }

  async function handleTariffSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSavingTariff(true);
    setNotice(null);
    try {
      const payload = {
        meterId: Number(tariffForm.meterId),
        pricePerUnit: Number(tariffForm.pricePerUnit),
        fixedFee: Number(tariffForm.fixedFee || 0),
        validFrom: tariffForm.validFrom,
        notes: tariffForm.notes,
      };

      if (editingTariffId) {
        await api.put(`/utilities/tariffs/${editingTariffId}`, payload);
      } else {
        await api.post('/utilities/tariffs', payload);
      }

      resetTariffForm();
      await loadData();
      setNotice({ type: 'success', message: editingTariffId ? 'Тариф оновлено' : 'Тариф збережено' });
    } catch (error) {
      console.error('Помилка збереження тарифу', error);
      setNotice({ type: 'error', message: 'Не вдалося зберегти тариф' });
    } finally {
      setSavingTariff(false);
    }
  }

  function startEditMeter(meter: UtilityMeter) {
    setEditingMeterId(meter.id);
    setMeterForm({
      name: meter.name,
      utilityType: meter.utilityType,
      unit: meter.unit,
      location: meter.location || '',
      accountNumber: meter.accountNumber || '',
      notes: meter.notes || '',
      isActive: meter.isActive,
    });
  }

  function startEditTariff(tariff: UtilityTariff) {
    setEditingTariffId(tariff.id);
    setTariffForm({
      meterId: String(tariff.meterId),
      pricePerUnit: String(tariff.pricePerUnit),
      fixedFee: String(tariff.fixedFee),
      validFrom: new Date(tariff.validFrom).toISOString().slice(0, 10),
      notes: tariff.notes || '',
    });
  }

  const totalEstimatedCost = useMemo(
    () => meters.reduce((sum, meter) => sum + (meter.estimatedCost || 0), 0),
    [meters]
  );

  const activeMetersCount = useMemo(
    () => meters.filter((meter) => meter.isActive).length,
    [meters]
  );

  async function handlePrintUtilitiesReport() {
    try {
      const response = await api.get(`/reports/utilities?start=${reportStartDate}&end=${reportEndDate}`);
      const reportRows = response.data as any[];

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        setNotice({ type: 'error', message: 'Не вдалося відкрити вікно друку' });
        return;
      }

      const rowsHtml = reportRows.length > 0
        ? reportRows.map((row) => `
            <tr>
              <td>${row.meterName}</td>
              <td>${row.utilityType}<br><small>${row.unit}</small></td>
              <td style="text-align:right">${row.startReading ?? '—'}</td>
              <td style="text-align:right">${row.endReading ?? '—'}</td>
              <td style="text-align:right;font-weight:700">${Number(row.consumption || 0).toFixed(3)} ${row.unit}</td>
              <td style="text-align:right">${row.tariffPrice != null ? `${Number(row.tariffPrice).toFixed(4)} грн` : '—'}</td>
              <td style="text-align:right;font-weight:700">${Number(row.estimatedCost || 0).toFixed(2)} грн</td>
            </tr>
          `).join('')
        : '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7280">Немає даних за обраний період</td></tr>';

      printWindow.document.write(`
        <html>
          <head>
            <title>Звіт по лічильниках</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { margin: 0 0 8px; font-size: 24px; }
              .meta { margin-bottom: 24px; color: #6b7280; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #d1d5db; padding: 10px 12px; font-size: 12px; vertical-align: top; }
              th { background: #f3f4f6; text-align: left; }
              .footer { margin-top: 28px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Звіт по комунальних лічильниках</h1>
            <div class="meta">
              ${(settings?.name || 'Заклад дошкільної освіти')}<br>
              Період: ${new Date(reportStartDate).toLocaleDateString('uk-UA')} - ${new Date(reportEndDate).toLocaleDateString('uk-UA')}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Лічильник</th>
                  <th>Тип / Од.</th>
                  <th>Початкові показання</th>
                  <th>Кінцеві показання</th>
                  <th>Спожито</th>
                  <th>Тариф</th>
                  <th>Сума</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div class="footer">Сформовано: ${new Date().toLocaleString('uk-UA')}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error('Помилка друку звіту по лічильниках', error);
      setNotice({ type: 'error', message: 'Не вдалося сформувати звіт по лічильниках' });
    }
  }

  const monthlyConsumptionByType = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('uk-UA', { month: 'short' });
      months.push({ key, label });
    }

    const totals = new Map<string, Map<string, number>>();
    const readingsByMeter = new Map<number, UtilityReading[]>();

    for (const reading of readings) {
      const current = readingsByMeter.get(reading.meterId) || [];
      current.push(reading);
      readingsByMeter.set(reading.meterId, current);
    }

    for (const meter of meters) {
      const meterReadings = (readingsByMeter.get(meter.id) || []).slice().sort((a, b) => {
        const dateDiff = new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime();
        return dateDiff !== 0 ? dateDiff : a.id - b.id;
      });

      for (let index = 1; index < meterReadings.length; index += 1) {
        const previous = meterReadings[index - 1];
        const current = meterReadings[index];
        const delta = current.readingValue - previous.readingValue;
        if (delta < 0) continue;

        const currentDate = new Date(current.readingDate);
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const typeMap = totals.get(meter.utilityType) || new Map<string, number>();
        typeMap.set(monthKey, Number(((typeMap.get(monthKey) || 0) + delta).toFixed(3)));
        totals.set(meter.utilityType, typeMap);
      }
    }

    return utilityTypeOptions
      .map((typeOption) => {
        const typeMap = totals.get(typeOption.id) || new Map<string, number>();
        const items: MonthlyConsumptionItem[] = months.map((month) => ({
          monthKey: month.key,
          label: month.label,
          total: typeMap.get(month.key) || 0,
          utilityType: typeOption.id,
        }));

        const hasAnyValue = items.some((item) => item.total > 0);
        if (!hasAnyValue) return null;

        return {
          utilityType: typeOption.id,
          label: typeOption.name,
          items,
          maxTotal: Math.max(...items.map((item) => item.total), 1),
          unit:
            meters.find((meter) => meter.utilityType === typeOption.id)?.unit ||
            unitOptionsByUtilityType[typeOption.id]?.[0]?.id ||
            'од.',
        };
      })
      .filter(Boolean) as Array<{
        utilityType: string;
        label: string;
        items: MonthlyConsumptionItem[];
        maxTotal: number;
        unit: string;
      }>;
  }, [meters, readings]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Комунальні лічильники</h1>
        <p className="mt-2 text-gray-500">Облік приладів, показань, тарифів і орієнтовних витрат по закладу.</p>
      </div>

      {notice && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-red-100 bg-red-50 text-red-700'
            : 'border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notice.message}
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Початкова дата звіту</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(event) => setReportStartDate(event.target.value)}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Кінцева дата звіту</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(event) => setReportEndDate(event.target.value)}
                className="ui-input w-full"
              />
            </div>
          </div>
          <button
            onClick={handlePrintUtilitiesReport}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <Printer size={18} />
            Друк звіту
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-warm-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-warm-100 p-3 text-warm-600">
              <Gauge size={22} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-400">Активні лічильники</div>
              <div className="text-2xl font-black text-gray-800">{activeMetersCount}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <Activity size={22} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-400">Останні показання</div>
              <div className="text-2xl font-black text-gray-800">{readings.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <Calculator size={22} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-400">Орієнтовно за цикл</div>
              <div className="text-2xl font-black text-gray-800">{totalEstimatedCost.toFixed(2)} грн</div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">Динаміка споживання по місяцях</h2>
          <p className="mt-1 text-sm text-gray-500">Розрахунок будується за різницею між послідовними показаннями кожного лічильника.</p>
        </div>

        {monthlyConsumptionByType.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {monthlyConsumptionByType.map((chart) => (
              <div key={chart.utilityType} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {getUtilityTypeIcon(chart.utilityType)}
                    <div className="font-bold text-gray-800">{chart.label}</div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{chart.unit}</div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {chart.items.map((item) => (
                    <div key={item.monthKey} className="flex flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end rounded-xl bg-white px-1.5 py-2 shadow-inner">
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-warm-500 to-warm-300 transition-all"
                          style={{
                            height: `${Math.max((item.total / chart.maxTotal) * 100, item.total > 0 ? 10 : 0)}%`,
                          }}
                          title={`${item.total.toFixed(3)} ${chart.unit}`}
                        />
                      </div>
                      <div className="text-[11px] font-bold uppercase text-gray-400">{item.label}</div>
                      <div className="text-xs font-semibold text-gray-700">{item.total.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-medium text-gray-400">
            Графіки з’являться після внесення щонайменше двох показань для одного лічильника.
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Лічильники</h2>
              <button
                onClick={resetMeterForm}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-warm-600"
              >
                <Plus size={16} />
                Новий лічильник
              </button>
            </div>

            <form onSubmit={handleMeterSubmit} className="mb-6 grid gap-4 rounded-2xl border border-warm-100 bg-warm-50/40 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Назва</label>
                <input
                  required
                  value={meterForm.name}
                  onChange={(event) => setMeterForm({ ...meterForm, name: event.target.value })}
                  className="ui-input w-full"
                  placeholder="Основний електролічильник"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Тип ресурсу</label>
                <CustomSelect
                  options={utilityTypeOptions}
                  value={meterForm.utilityType}
                  onChange={(value) => {
                    const nextType = String(value);
                    const nextUnit = (unitOptionsByUtilityType[nextType] || unitOptionsByUtilityType.other)[0]?.id || 'од.';
                    setMeterForm((current) => ({
                      ...current,
                      utilityType: nextType,
                      unit: nextUnit,
                    }));
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Одиниця виміру</label>
                <CustomSelect
                  options={unitOptions}
                  value={meterForm.unit}
                  onChange={(value) => setMeterForm({ ...meterForm, unit: String(value) })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Локація</label>
                <input
                  value={meterForm.location}
                  onChange={(event) => setMeterForm({ ...meterForm, location: event.target.value })}
                  className="ui-input w-full"
                  placeholder="Кухня, підвал, корпус А"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Особовий рахунок</label>
                <input
                  value={meterForm.accountNumber}
                  onChange={(event) => setMeterForm({ ...meterForm, accountNumber: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="meter-active"
                  type="checkbox"
                  checked={meterForm.isActive}
                  onChange={(event) => setMeterForm({ ...meterForm, isActive: event.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="meter-active" className="text-sm font-semibold text-gray-700">Активний лічильник</label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Примітки</label>
                <input
                  value={meterForm.notes}
                  onChange={(event) => setMeterForm({ ...meterForm, notes: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                {editingMeterId && (
                  <button type="button" onClick={resetMeterForm} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">
                    Скасувати редагування
                  </button>
                )}
                <button type="submit" disabled={savingMeter} className="rounded-xl bg-warm-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-warm-700 disabled:opacity-50">
                  {savingMeter ? 'Збереження...' : editingMeterId ? 'Оновити лічильник' : 'Зберегти лічильник'}
                </button>
              </div>
            </form>

            <div className="grid gap-4">
              {meters.map((meter) => (
                <div key={meter.id} className="rounded-2xl border border-gray-100 p-4 transition hover:border-warm-200">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-gray-50 p-2">
                        {getUtilityTypeIcon(meter.utilityType)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{meter.name}</div>
                        <div className="text-sm text-gray-500">
                          {getUtilityTypeLabel(meter.utilityType)} · {meter.unit} · {meter.location || 'Локацію не вказано'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => startEditMeter(meter)}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                    >
                      <Pencil size={14} />
                      Редагувати
                    </button>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] font-bold uppercase text-gray-400">Останнє показання</div>
                      <div className="mt-1 font-black text-gray-800">
                        {meter.latestReading ? `${meter.latestReading.readingValue} ${meter.unit}` : 'Немає'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] font-bold uppercase text-gray-400">Остання витрата</div>
                      <div className="mt-1 font-black text-gray-800">
                        {meter.lastConsumption !== null && meter.lastConsumption !== undefined ? `${meter.lastConsumption} ${meter.unit}` : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] font-bold uppercase text-gray-400">Орієнтовна сума</div>
                      <div className="mt-1 font-black text-gray-800">
                        {meter.estimatedCost !== null && meter.estimatedCost !== undefined ? `${meter.estimatedCost.toFixed(2)} грн` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-800">Історія показань</h2>
            <form onSubmit={handleReadingSubmit} className="mb-6 grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Лічильник</label>
                <CustomSelect
                  options={meterOptions}
                  value={readingForm.meterId}
                  onChange={(value) => setReadingForm({ ...readingForm, meterId: String(value) })}
                  placeholder="Оберіть лічильник"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Дата показання</label>
                <input
                  required
                  type="date"
                  value={readingForm.readingDate}
                  onChange={(event) => setReadingForm({ ...readingForm, readingDate: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Показання</label>
                <input
                  required
                  type="number"
                  step="0.001"
                  value={readingForm.readingValue}
                  onChange={(event) => setReadingForm({ ...readingForm, readingValue: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Примітки</label>
                <input
                  value={readingForm.notes}
                  onChange={(event) => setReadingForm({ ...readingForm, notes: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={savingReading} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {savingReading ? 'Збереження...' : 'Додати показання'}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Лічильник</th>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3">Показання</th>
                    <th className="px-4 py-3">Примітки</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{reading.meterName}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(reading.readingDate).toLocaleDateString('uk-UA')}</td>
                      <td className="px-4 py-3 text-gray-700">{reading.readingValue} {reading.unit}</td>
                      <td className="px-4 py-3 text-gray-500">{reading.notes || '—'}</td>
                    </tr>
                  ))}
                  {readings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Показань ще немає</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-gray-800">Тарифи</h2>
          <form onSubmit={handleTariffSubmit} className="mb-6 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Лічильник</label>
              <CustomSelect
                options={meterOptions}
                value={tariffForm.meterId}
                onChange={(value) => setTariffForm({ ...tariffForm, meterId: String(value) })}
                placeholder="Оберіть лічильник"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Ціна за одиницю</label>
                <input
                  required
                  type="number"
                  step="0.0001"
                  value={tariffForm.pricePerUnit}
                  onChange={(event) => setTariffForm({ ...tariffForm, pricePerUnit: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Фіксована абонплата</label>
                <input
                  type="number"
                  step="0.01"
                  value={tariffForm.fixedFee}
                  onChange={(event) => setTariffForm({ ...tariffForm, fixedFee: event.target.value })}
                  className="ui-input w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Діє з</label>
              <input
                required
                type="date"
                value={tariffForm.validFrom}
                onChange={(event) => setTariffForm({ ...tariffForm, validFrom: event.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Примітки</label>
              <input
                value={tariffForm.notes}
                onChange={(event) => setTariffForm({ ...tariffForm, notes: event.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div className="flex justify-end gap-3">
              {editingTariffId && (
                <button type="button" onClick={resetTariffForm} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">
                  Скасувати
                </button>
              )}
              <button type="submit" disabled={savingTariff} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
                {savingTariff ? 'Збереження...' : editingTariffId ? 'Оновити тариф' : 'Зберегти тариф'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {tariffs.map((tariff) => (
              <div key={tariff.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800">{tariff.meterName}</div>
                    <div className="text-sm text-gray-500">
                      {getUtilityTypeLabel(tariff.utilityType || '')} · з {new Date(tariff.validFrom).toLocaleDateString('uk-UA')}
                    </div>
                  </div>
                  <button
                    onClick={() => startEditTariff(tariff)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    <Pencil size={14} />
                    Редагувати
                  </button>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-[11px] font-bold uppercase text-gray-400">Ціна за одиницю</div>
                    <div className="mt-1 font-black text-gray-800">{tariff.pricePerUnit} грн / {tariff.unit}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-[11px] font-bold uppercase text-gray-400">Абонплата</div>
                    <div className="mt-1 font-black text-gray-800">{tariff.fixedFee.toFixed(2)} грн</div>
                  </div>
                </div>
                {tariff.notes && <div className="mt-3 text-sm text-gray-500">{tariff.notes}</div>}
              </div>
            ))}
            {tariffs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-medium text-gray-400">
                Тарифів ще немає
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UtilitiesPage;
