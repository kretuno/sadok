import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { addDays, format, startOfWeek, getDate, getMonth } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Package, Baby, FileText, Gift, AlertTriangle, Syringe, HeartPulse, PlusCircle, ArrowDownCircle, Info, Receipt, Database } from 'lucide-react';
import { educationQuotes } from '../../data/quotes';
import { useSettings } from '../../contexts/SettingsContext';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { settings } = useSettings();
  
  const [stats, setStats] = useState({
    stockItems: 0,
    stockValue: 0,
    lowStock: 0,
    recipesCount: 0,
    weekMenusCount: 0,
    confirmedMenusCount: 0,
    totalChildren: 0,
    totalEmployees: 0,
    hasMenuToday: false,
    pendingInvoices: 0,
  });
  
  const [weeklyMenuChart, setWeeklyMenuChart] = useState<Array<{ label: string; totalCost: number; totalChildren: number; menuExists: boolean; isConfirmed: boolean }>>([]);
  const [weeklyTopProducts, setWeeklyTopProducts] = useState<Array<{ productId: number; productName: string; unit: string; totalCost: number; totalQuantity: number; daysUsed: number }>>([]);
  const [quote, setQuote] = useState('');
  
  // Alerts state
  const [birthdays, setBirthdays] = useState<Array<{ name: string; age: number; isToday: boolean }>>([]);
  const [lowStockItems, setLowStockItems] = useState<number>(0);

  const [medicalAlerts, setMedicalAlerts] = useState({
    sickCount: 0,
    upcomingVaccines: 0,
    expiringMeds: 0
  });

  useEffect(() => {
    // Generate random quote
    const randomQuote = educationQuotes[Math.floor(Math.random() * educationQuotes.length)];
    setQuote(randomQuote);

    const loadDashboard = async () => {
      const todayDate = new Date();
      const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const dates = Array.from({ length: 7 }).map((_, index) => addDays(weekStart, index));

      const results = await Promise.allSettled([
        api.get('/products'),
        api.get('/recipes'),
        api.get(`/menus?start=${format(weekStart, 'yyyy-MM-dd')}&end=${format(weekEnd, 'yyyy-MM-dd')}`),
        api.get('/children'),
        api.get('/employees'),
        api.get('/medical/illnesses'),
        api.get('/medical/vaccinations'),
        api.get('/medical/medications'),
        api.get('/invoices')
      ]);

      const getValue = (result: PromiseSettledResult<any>, fallback: any = []) => {
        return result.status === 'fulfilled' ? result.value.data : fallback;
      };

      const products = getValue(results[0]) as Array<{ stockQuantity: number; totalValue: number; isLowStock: boolean }>;
      const recipes = getValue(results[1]) as Array<any>;
      const menus = getValue(results[2]) as Array<{ id: number; date: string; isConfirmed: boolean }>;
      const children = getValue(results[3]) as Array<{ fullName: string; birthDate: string }>;
      const employees = getValue(results[4]) as Array<any>;
      const illnessesRecords = getValue(results[5]) as Array<{ endDate: string | null }>;
      const vaccinationsRecords = getValue(results[6]) as Array<{ status: string; planDate: string | null }>;
      const medicationsRecords = getValue(results[7]) as Array<{ expiryDate: string | null }>;
      const allInvoices = getValue(results[8]) as Array<{ status: string }>;

      const todayMenu = menus.find(m => new Date(m.date).toDateString() === todayDate.toDateString());
      
      const lowStockCount = products.filter((item) => item.isLowStock).length;
      
      setStats({
        stockItems: products.reduce((sum, item) => sum + Number(item.stockQuantity || 0), 0),
        stockValue: products.reduce((sum, item) => sum + Number(item.totalValue || 0), 0),
        lowStock: lowStockCount,
        recipesCount: recipes.length,
        weekMenusCount: menus.length,
        confirmedMenusCount: menus.filter((item) => item.isConfirmed).length,
        totalChildren: children.length,
        totalEmployees: employees.length,
        hasMenuToday: !!todayMenu,
        pendingInvoices: allInvoices.filter(i => i.status === 'draft').length
      });
      
      setLowStockItems(lowStockCount);

      const bdays = children.filter(c => {
        const bd = new Date(c.birthDate);
        return (getDate(bd) === getDate(todayDate) && getMonth(bd) === getMonth(todayDate)) ||
               (getDate(bd) === getDate(addDays(todayDate, 1)) && getMonth(bd) === getMonth(addDays(todayDate, 1)));
      }).map(c => {
        const bd = new Date(c.birthDate);
        const age = todayDate.getFullYear() - bd.getFullYear();
        const isBdayToday = getDate(bd) === getDate(todayDate);
        return { name: c.fullName, age, isToday: isBdayToday };
      });
      
      setBirthdays(bdays);

      // Process Medical Alerts
      const sickList = illnessesRecords.filter(r => !r.endDate || new Date(r.endDate) >= todayDate);
      const vaccineList = vaccinationsRecords.filter(v => 
        v.status === 'planned' && v.planDate && new Date(v.planDate) <= addDays(todayDate, 7)
      );
      const expiringMedsList = medicationsRecords.filter(m => 
        m.expiryDate && new Date(m.expiryDate) <= addDays(todayDate, 30)
      );

      setMedicalAlerts({
         sickCount: sickList.length,
         upcomingVaccines: vaccineList.length,
         expiringMeds: expiringMedsList.length
      });

      const menuDetails = await Promise.all(
        menus.map(async (menu) => {
          const response = await api.get(`/menus/${menu.id}`);
          return response.data as {
            id: number;
            date: string;
            isConfirmed: boolean;
            totals: { totalChildren: number; totalCostAll: number };
            summaryNeeds: Array<{ productId: number; productName: string; unit: string; totalGrossQuantity: number; totalCost: number }>;
          };
        })
      );

      const detailsByDate = new Map(
        menuDetails.map((menu) => [new Date(menu.date).toDateString(), menu])
      );

      setWeeklyMenuChart(
        dates.map((day) => {
          const key = day.toDateString();
          const detail = detailsByDate.get(key);
          return {
            label: format(day, 'EE', { locale: uk }),
            totalCost: Number(detail?.totals?.totalCostAll || 0),
            totalChildren: Number(detail?.totals?.totalChildren || 0),
            menuExists: Boolean(detail),
            isConfirmed: Boolean(detail?.isConfirmed),
          };
        })
      );

      const topProductsMap = new Map<number, { productId: number; productName: string; unit: string; totalCost: number; totalQuantity: number; daysUsed: number }>();

      menuDetails.forEach((menu) => {
        (menu.summaryNeeds || []).forEach((product) => {
          const existing = topProductsMap.get(product.productId);
          if (existing) {
            existing.totalCost += Number(product.totalCost || 0);
            existing.totalQuantity += Number(product.totalGrossQuantity || 0);
            existing.daysUsed += 1;
            return;
          }

          topProductsMap.set(product.productId, {
            productId: product.productId,
            productName: product.productName,
            unit: product.unit,
            totalCost: Number(product.totalCost || 0),
            totalQuantity: Number(product.totalGrossQuantity || 0),
            daysUsed: 1,
          });
        });
      });

      setWeeklyTopProducts(
        Array.from(topProductsMap.values())
          .sort((a, b) => b.totalCost - a.totalCost)
          .slice(0, 4)
      );
    };

    void loadDashboard();
  }, []);

  const maxWeeklyCost = useMemo(
    () => Math.max(1, ...weeklyMenuChart.map((item) => item.totalCost)),
    [weeklyMenuChart]
  );

  const weeklyMenuTotals = useMemo(
    () => ({
      totalCost: weeklyMenuChart.reduce((sum, item) => sum + item.totalCost, 0),
      totalChildren: weeklyMenuChart.reduce((sum, item) => sum + item.totalChildren, 0),
    }),
    [weeklyMenuChart]
  );

  const maxTopProductCost = useMemo(
    () => Math.max(1, ...weeklyTopProducts.map((item) => item.totalCost)),
    [weeklyTopProducts]
  );

  const showBackupAlert = useMemo(() => {
    if (!settings) return false;
    
    if (!settings.lastBackupDate) {
      return true;
    }
    
    const lastBackup = new Date(settings.lastBackupDate);
    const diffTime = Date.now() - lastBackup.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays > 2;
  }, [settings]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative pb-10">
      
      {/* Quote Banner */}
      {settings?.showQuotes !== false && quote && (
        <div className="bg-gradient-to-r from-warm-500 to-warm-400 p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute opacity-10 -right-4 -top-8 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
            <span className="text-[150px]">🌻</span>
          </div>
          <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
            <span className="text-warm-100 mb-2 font-bold tracking-widest uppercase text-xs" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}>🌻 Цитата дня</span>
            <p className="text-white text-lg md:text-xl font-medium italic leading-relaxed" style={{ textShadow: '0px 1px 4px rgba(0,0,0,0.35)' }}>
              "{quote.split('(')[0].trim()}"
            </p>
            {quote.includes('(') && (
               <p className="text-warm-100 text-sm mt-3 font-semibold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}>— {quote.split('(')[1].replace(')', '')}</p>
            )}
          </div>
        </div>
      )}

      {/* Trial / License Status Banner */}
      {(!settings?.isActivated || settings?.isExpired) && (
        <div className={`p-4 rounded-3xl border flex items-center justify-between gap-4 animate-pulse-subtle shadow-sm ${
          settings?.isExpired ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              settings?.isExpired ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className={`font-bold ${settings?.isExpired ? 'text-red-800' : 'text-blue-800'}`}>
                {settings?.isExpired 
                  ? (settings?.isActivated ? 'Термін дії ліцензії закінчився' : 'Пробний період завершився') 
                  : 'Пробний період'}
              </h4>
              <p className={`text-sm ${settings?.isExpired ? 'text-red-600' : 'text-blue-600'}`}>
                {settings?.isExpired 
                  ? (settings?.isActivated 
                      ? 'Будь ласка, введіть новий ліцензійний ключ в налаштуваннях для продовження повноцінної роботи.' 
                      : 'Основні функції програми обмежено. Будь ласка, активуйте ліцензію для продовження роботи.')
                  : `Ви використовуєте ознайомчу версію. Залишилося днів: ${settings?.daysRemaining || 0}`}
              </p>
            </div>
          </div>
          <Link to="/settings" onClick={() => {}} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 ${
            settings?.isExpired 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            Активувати
          </Link>
        </div>
      )}

      {/* Main Indicators */}
      <h2 className="text-lg font-bold text-gray-800 mt-6 md:mt-8 tracking-wide">Панель керування: Сьогодні</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <Baby size={22} className="sm:w-6 sm:h-6" />
               </div>
               <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">Вихованці</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-800 leading-none">{stats.totalChildren}</div>
         </div>
         
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                  <FileText size={22} className="sm:w-6 sm:h-6" />
               </div>
               <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">Меню на сьогодні</div>
            </div>
            <div className={`text-lg sm:text-xl font-black leading-none ${stats.hasMenuToday ? 'text-emerald-600' : 'text-red-500'}`}>
              {stats.hasMenuToday ? 'СТВОРЕНО' : 'НЕ СТВОРЕНО'}
            </div>
         </div>
         
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 flex flex-col justify-between group">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-warm-50 text-warm-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Package size={22} className="sm:w-6 sm:h-6" />
               </div>
               <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">Запаси складу</div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-800 leading-tight break-words">
              {formatMoney(stats.stockValue)}
            </div>
         </div>
         
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-warm-100 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <HeartPulse size={22} className="sm:w-6 sm:h-6" />
               </div>
               <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">Співробітники</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-800 leading-none">{stats.totalEmployees}</div>
         </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-warm-50/50 p-4 rounded-3xl border border-warm-100 flex flex-wrap items-center gap-4">
         <span className="text-xs font-bold text-warm-600 uppercase tracking-widest px-2">Швидкий доступ:</span>
         <Link to="/children" className="bg-white hover:bg-warm-100 border border-warm-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95">
            <PlusCircle size={18} className="text-blue-500" /> Додати дитину
         </Link>
         <Link to="/inventory" className="bg-white hover:bg-warm-100 border border-warm-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95">
            <ArrowDownCircle size={18} className="text-emerald-500" /> Прихід товару
         </Link>
         <Link to="/menu" className="bg-white hover:bg-warm-100 border border-warm-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95">
            <FileText size={18} className="text-purple-500" /> Створити меню
         </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Menu Analytics (Takes 2 columns) */}
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm lg:col-span-2">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-warm-100 pb-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-warm-500">Меню та витрати</div>
              <h3 className="mt-1 text-lg font-bold text-gray-800">Аналітика за поточний тиждень</h3>
            </div>
            <div className="grid w-full gap-2 text-center sm:min-w-[420px] sm:w-auto sm:grid-cols-4">
              <div className="rounded-2xl border border-warm-100 bg-warm-50 px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-warm-600">Меню</div>
                <div className="mt-1 text-lg font-black text-gray-900">{stats.weekMenusCount}</div>
              </div>
              <div className="rounded-2xl border border-warm-100 bg-warm-50/60 px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-warm-600">Підтв.</div>
                <div className="mt-1 text-lg font-black text-gray-900">{stats.confirmedMenusCount}</div>
              </div>
              <div className="rounded-2xl border border-warm-100 bg-warm-50/30 px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-warm-600">Сума</div>
                <div className="mt-1 text-sm font-black text-gray-900">{formatMoney(weeklyMenuTotals.totalCost)}</div>
              </div>
              <div className="rounded-2xl border border-warm-100 bg-warm-50/20 px-3 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-warm-600">Дата</div>
                <div className="mt-1 text-sm font-black text-gray-900">{format(new Date(), 'dd.MM.yyyy')}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            <div className="rounded-2xl border border-warm-100 bg-warm-50/20 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Витрати по днях</div>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {weeklyMenuChart.map((item) => {
                  const barHeight = maxWeeklyCost > 0 ? (item.totalCost / maxWeeklyCost) * 100 : 0;
                  return (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                      <div className="text-[11px] font-black text-gray-500">{item.label}</div>
                      <div className="relative flex h-24 w-full flex-col items-center justify-end overflow-hidden rounded-xl border border-warm-100 bg-white/90">
                        {item.menuExists ? (
                          <div
                            className={`w-full transition-all duration-500 ${item.isConfirmed ? 'bg-warm-500' : 'bg-warm-200'}`}
                            style={{ height: `${Math.max(barHeight, 12)}%` }}
                            title={`${formatMoney(item.totalCost)} · дітей: ${item.totalChildren}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-300">—</div>
                        )}
                      </div>
                      <div className="min-h-[30px] text-center text-[10px] font-semibold leading-tight text-gray-400">
                        {item.menuExists ? (
                          <>
                            <div>{formatMoney(item.totalCost).replace(',00', '')}</div>
                            <div>{item.totalChildren} д.</div>
                          </>
                        ) : (
                          <div>Немає меню</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-warm-100 bg-warm-50/40 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-warm-600">Топ продуктів</div>
                  <div className="mt-1 text-sm font-semibold text-gray-500">Найбільші витрати за тиждень</div>
                </div>
                <div className="rounded-full border border-warm-100 bg-white/80 px-3 py-1 text-[11px] font-bold text-gray-500">
                  До 4 позицій
                </div>
              </div>

              <div className="space-y-3">
                {weeklyTopProducts.length > 0 ? (
                  weeklyTopProducts.map((product, index) => {
                    const productBarWidth = maxTopProductCost > 0
                      ? Math.max((product.totalCost / maxTopProductCost) * 100, 10)
                      : 8;

                    return (
                      <div key={product.productId} className="rounded-2xl border border-warm-100 bg-white/80 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warm-100 px-2 text-[11px] font-black text-warm-600">
                                {index + 1}
                              </span>
                              <span className="truncate text-sm font-bold text-gray-800">{product.productName}</span>
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-gray-500">
                              {product.totalQuantity.toFixed(3)} {product.unit} · {product.daysUsed} дн.
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-black text-gray-800">{formatMoney(product.totalCost)}</div>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-warm-100/80">
                          <div
                            className="h-full rounded-full bg-warm-500"
                            style={{ width: `${Math.min(productBarWidth, 100)}%` }}
                            title={`${product.totalQuantity.toFixed(3)} ${product.unit}`}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-gray-500">
                          <span>Частка від лідера</span>
                          <span>{Math.round((product.totalCost / maxTopProductCost) * 100)}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-warm-200 bg-white/80 px-4 py-6 text-center text-sm text-gray-400">
                    Немає даних меню за цей тиждень.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Reminders */}
        <div className="space-y-6">
           <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm relative overflow-hidden">
             
             <div className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-4 flex items-center gap-2">
               <AlertTriangle size={14} /> Увага / Нагадування
             </div>

             <div className="space-y-3">
                {/* Stock Warning */}
                {lowStockItems > 0 && (
                  <Link to="/inventory" className="block bg-red-50 border border-red-100 p-3 rounded-xl hover:bg-red-100 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-3">
                       <div className="mt-0.5 text-red-500 group-hover:scale-110 transition-transform"><Package size={18} /></div>
                       <div>
                          <p className="text-sm font-bold text-red-800">Закінчуються продукти</p>
                          <p className="text-xs text-red-600 mt-1">Виявлено критичний залишок: {lowStockItems} позицій.</p>
                       </div>
                    </div>
                  </Link>
                )}
                
                {/* Backup Warning */}
                {showBackupAlert && (
                  <Link to="/settings" className="block bg-red-50 border border-red-100 p-3 rounded-xl hover:bg-red-100 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-3">
                       <div className="mt-0.5 text-red-500 group-hover:scale-110 transition-transform"><Database size={18} /></div>
                       <div>
                          <p className="text-sm font-bold text-red-800">Відсутні резервні копії</p>
                          <p className="text-xs text-red-600 mt-1">
                            {settings?.lastBackupDate 
                              ? `Остання копія бази даних була створена більше 2 днів тому: ${new Date(settings.lastBackupDate).toLocaleDateString('uk-UA')}.`
                              : 'Не виявлено жодної резервної копії бази даних.'}
                            {' '}Створіть резервну копію у вкладці налаштувань.
                          </p>
                       </div>
                    </div>
                  </Link>
                )}
                
                {/* Pending Invoices Alert */}
                {stats.pendingInvoices > 0 && (
                  <Link to="/inventory" className="block bg-amber-50 border border-amber-100 p-3 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer group">
                    <div className="flex items-start gap-3">
                       <div className="mt-0.5 text-amber-500 group-hover:scale-110 transition-transform"><Receipt size={18} /></div>
                       <div>
                          <p className="text-sm font-bold text-amber-800">Чернетки накладних</p>
                          <p className="text-xs text-amber-600 mt-1">Виявлено {stats.pendingInvoices} не проведених накладних. Проведіть їх для оновлення залишків.</p>
                       </div>
                    </div>
                  </Link>
                )}

                {/* Sick Alert */}
                {medicalAlerts.sickCount > 0 && (
                   <Link to="/medical" className="block bg-orange-50 border border-orange-100 p-3 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer group">
                     <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-orange-500 group-hover:scale-110 transition-transform"><HeartPulse size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-orange-800">Зараз хворіють</p>
                           <p className="text-xs text-orange-600 mt-1">На лікарняному перебуває {medicalAlerts.sickCount} вихованців.</p>
                        </div>
                     </div>
                   </Link>
                )}

                {/* Upcoming Vaccinations */}
                {medicalAlerts.upcomingVaccines > 0 && (
                   <Link to="/medical" className="block bg-blue-50 border border-blue-100 p-3 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer group">
                     <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-blue-500 group-hover:scale-110 transition-transform"><Syringe size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-blue-800">Планові щеплення</p>
                           <p className="text-xs text-blue-600 mt-1">{medicalAlerts.upcomingVaccines} щеплень заплановано на цей тиждень.</p>
                        </div>
                     </div>
                   </Link>
                )}

                {/* Expiring Meds */}
                {medicalAlerts.expiringMeds > 0 && (
                   <Link to="/medical" className="block bg-rose-50 border border-rose-100 p-3 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer group">
                     <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-rose-500 group-hover:scale-110 transition-transform"><Info size={18} /></div>
                        <div>
                           <p className="text-sm font-bold text-rose-800">Термін придатності ліків</p>
                           <p className="text-xs text-rose-600 mt-1">Виявлено {medicalAlerts.expiringMeds} препаратів, термін яких минає.</p>
                        </div>
                     </div>
                   </Link>
                )}

                {/* Birthdays */}
                {birthdays.length > 0 ? (
                  birthdays.map((bday, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3">
                       <div className="mt-0.5 text-amber-500"><Gift size={18} /></div>
                       <div>
                          <p className="text-sm font-bold text-amber-800">
                             {bday.isToday ? 'Сьогодні' : 'Завтра'} день народження!
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                             <span className="font-bold">{bday.name}</span> святкуватиме {bday.age}-річчя 🎂
                          </p>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-center">
                    <p className="text-xs font-semibold text-gray-500">Найближчими днями святкувань не передбачається.</p>
                  </div>
                )}
                
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
