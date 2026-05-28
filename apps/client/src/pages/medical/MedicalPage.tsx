import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Pill, Activity, Syringe, Users, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { differenceInDays } from 'date-fns';

const MedicationsTab = lazy(() => import('./tabs/MedicationsTab'));
const MedicalCardsTab = lazy(() => import('./tabs/MedicalCardsTab'));
const IllnessesTab = lazy(() => import('./tabs/IllnessesTab'));
const VaccinationsTab = lazy(() => import('./tabs/VaccinationsTab'));

const tabs = [
  { id: 'cards', label: 'Медичні картки дітей', icon: Users },
  { id: 'illnesses', label: 'Журнал захворювань', icon: Activity },
  { id: 'vaccinations', label: 'Журнал щеплень', icon: Syringe },
  { id: 'medications', label: 'Склад медикаментів', icon: Pill },
];

export interface Medication {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  notes: string | null;
}

const MedicalTabFallback: React.FC = () => (
  <div className="flex min-h-[320px] items-center justify-center">
    <div className="rounded-2xl border border-warm-100 bg-warm-50 px-5 py-3 text-sm font-medium text-gray-600">
      Завантаження розділу...
    </div>
  </div>
);

const MedicalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cards');
  const [medications, setMedications] = useState<Medication[]>([]);
  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const res = await api.get('/medical/medications');
      setMedications(res.data);
    } catch (e) {
      console.error('Помилка завантаження медикаментів', e);
    }
  };

  const expiringMeds = medications.filter(m => {
    if (!m.expiryDate) return false;
    const diff = differenceInDays(new Date(m.expiryDate), new Date());
    return diff <= 30; // expiring within 30 days or already expired
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Медичний кабінет</h1>
      </div>

      {/* Warnings */}
      {expiringMeds.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl shadow-sm">
          <div className="flex justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-black text-red-800">
                  Увага! У медикаментів закінчується термін придатності (менше 30 днів) або вже закінчився
                </h3>
                <div className="mt-2 text-sm text-red-700 font-medium">
                  <ul className="list-disc pl-5 space-y-1">
                    {expiringMeds.map(m => (
                      <li key={m.id}>
                        {m.name} — до {new Date(m.expiryDate!).toLocaleDateString('uk-UA')} (Залишок: {m.quantity} {m.unit})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                ${isActive ? 'bg-warm-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
        <Suspense fallback={<MedicalTabFallback />}>
          {activeTab === 'cards' && <MedicalCardsTab />}
          {activeTab === 'illnesses' && <IllnessesTab />}
          {activeTab === 'vaccinations' && <VaccinationsTab />}
          {activeTab === 'medications' && (
            <MedicationsTab
              medications={medications}
              reloadMedications={loadMedications}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default MedicalPage;
