import React, { useState, useEffect } from 'react';
import { AppWindow, Brain, Search, Plus, Save, X, User, Printer, Users, ChevronLeft, HeartHandshake } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import CustomSelect from '../../components/ui/CustomSelect';

interface InclusiveCard {
  id: number;
  childId: number;
  supportLevel: number;
  specialNeeds?: string | null;
  teamMembers?: string | null;
  weeklyHours?: number | null;
  adaptationNeeds?: string | null;
  notes?: string | null;
  individualProgram?: string | null;
  createdAt?: string;
}

interface ChildCard {
  id: number;
  fullName: string;
  birthDate: string;
  groupId: number;
  status: string;
  card?: {
    temperament: string;
    adaptationLevel: string;
    speechDevelopment: string;
    socialSkills: string;
    familyStatus: string;
    notes: string;
    recommendations: string;
  } | null;
  inclusiveCard?: InclusiveCard | null;
}

interface Consultation {
  id: number;
  childId?: number;
  childName?: string;
  consultationType: string;
  topic: string;
  participants: string;
  notes: string;
  date: string;
}

interface Group {
  id: number;
  name: string;
}

const PsychologistPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'consultations' | 'inclusive'>('profiles');
  const [viewMode, setViewMode] = useState<'groups' | 'list'>('groups');
  const [children, setChildren] = useState<ChildCard[]>([]);
  const [inclusiveChildren, setInclusiveChildren] = useState<ChildCard[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildCard | null>(null);
  const [cardForm, setCardForm] = useState({
    temperament: '',
    adaptationLevel: '',
    speechDevelopment: '',
    socialSkills: '',
    familyStatus: '',
    notes: '',
    recommendations: ''
  });

  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [consultationForm, setConsultationForm] = useState({
    childId: '',
    consultationType: 'child_individual',
    topic: '',
    participants: '',
    notes: '',
    date: new Date().toISOString().slice(0, 16)
  });

  // Інклюзивна освіта
  const [showInclusiveModal, setShowInclusiveModal] = useState(false);
  const [selectedInclusiveChild, setSelectedInclusiveChild] = useState<ChildCard | null>(null);
  const [inclusiveForm, setInclusiveForm] = useState({
    supportLevel: 1,
    specialNeeds: '',
    teamMembers: '',
    weeklyHours: 0,
    adaptationNeeds: '',
    individualProgram: '',
    notes: ''
  });
  const [selectedSupportLevelFilter, setSelectedSupportLevelFilter] = useState<string>('all');
  const [showOnlyInclusiveOnRegister, setShowOnlyInclusiveOnRegister] = useState(true);
  const [printingInclusiveChild, setPrintingInclusiveChild] = useState<ChildCard | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingInclusiveChild(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardsRes, inclusiveRes, consRes, groupsRes] = await Promise.all([
        api.get('/psychologist/cards'),
        api.get('/psychologist/inclusive'),
        api.get('/psychologist/consultations'),
        api.get('/children/groups')
      ]);
      setChildren(cardsRes.data);
      setInclusiveChildren(inclusiveRes.data);
      setConsultations(consRes.data);
      setGroups(groupsRes.data);
      
      // Якщо дітей мало, автоматично перемикаємо у режим списку для кращої видимості
      if (cardsRes.data.length <= 5) {
        setViewMode('list');
      } else {
        setViewMode('groups');
      }
    } catch (error) {
      console.error('Помилка завантаження даних психолога', error);
    }
  };

  const filteredChildrenBySearch = children.filter(c => c.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Якщо є пошуковий запит, ми показуємо всіх знайдених (ігноруємо вибрану групу). 
  // Якщо немає пошуку - ми показуємо дітей вибраної групи.
  const displayChildren = searchTerm.trim().length > 0
    ? filteredChildrenBySearch
    : filteredChildrenBySearch.filter(c => selectedGroupId ? c.groupId === selectedGroupId : true);

  const handleEditCard = (child: ChildCard) => {
    setSelectedChild(child);
    if (child.card) {
      setCardForm({
        temperament: child.card.temperament || '',
        adaptationLevel: child.card.adaptationLevel || '',
        speechDevelopment: child.card.speechDevelopment || '',
        socialSkills: child.card.socialSkills || '',
        familyStatus: child.card.familyStatus || '',
        notes: child.card.notes || '',
        recommendations: child.card.recommendations || ''
      });
    } else {
      setCardForm({ temperament: '', adaptationLevel: '', speechDevelopment: '', socialSkills: '', familyStatus: '', notes: '', recommendations: '' });
    }
    setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    if (!selectedChild) return;
    try {
      await api.post('/psychologist/cards', {
        childId: selectedChild.id,
        ...cardForm
      });
      setShowCardModal(false);
      fetchData();
    } catch (error) {
      console.error('Помилка збереження психологічної картки', error);
    }
  };

  const handleSaveConsultation = async () => {
    try {
      if (editingConsultation) {
        await api.put(`/psychologist/consultations/${editingConsultation.id}`, consultationForm);
      } else {
        await api.post('/psychologist/consultations', consultationForm);
      }
      setShowConsultationModal(false);
      setEditingConsultation(null);
      setConsultationForm({
        childId: '',
        consultationType: 'child_individual',
        topic: '',
        participants: '',
        notes: '',
        date: new Date().toISOString().slice(0, 16)
      });
      fetchData();
    } catch (error) {
      console.error('Помилка збереження консультації', error);
    }
  };

  const handleEditConsultation = (consultation: Consultation) => {
    setEditingConsultation(consultation);
    setConsultationForm({
      childId: consultation.childId ? String(consultation.childId) : '',
      consultationType: consultation.consultationType,
      topic: consultation.topic,
      participants: consultation.participants || '',
      notes: consultation.notes || '',
      date: new Date(consultation.date).toISOString().slice(0, 16),
    });
    setShowConsultationModal(true);
  };

  const handleCloseConsultationModal = () => {
    setShowConsultationModal(false);
    setEditingConsultation(null);
    setConsultationForm({
      childId: '',
      consultationType: 'child_individual',
      topic: '',
      participants: '',
      notes: '',
      date: new Date().toISOString().slice(0, 16)
    });
  };

  const handleEditInclusive = (child: ChildCard) => {
    setSelectedInclusiveChild(child);
    if (child.inclusiveCard) {
      setInclusiveForm({
        supportLevel: child.inclusiveCard.supportLevel || 1,
        specialNeeds: child.inclusiveCard.specialNeeds || '',
        teamMembers: child.inclusiveCard.teamMembers || '',
        weeklyHours: child.inclusiveCard.weeklyHours || 0,
        adaptationNeeds: child.inclusiveCard.adaptationNeeds || '',
        individualProgram: child.inclusiveCard.individualProgram || '',
        notes: child.inclusiveCard.notes || ''
      });
    } else {
      setInclusiveForm({
        supportLevel: 1,
        specialNeeds: '',
        teamMembers: '',
        weeklyHours: 0,
        adaptationNeeds: '',
        individualProgram: '',
        notes: ''
      });
    }
    setShowInclusiveModal(true);
  };

  const handleSaveInclusive = async () => {
    if (!selectedInclusiveChild) return;
    try {
      await api.post('/psychologist/inclusive', {
        childId: selectedInclusiveChild.id,
        ...inclusiveForm
      });
      setShowInclusiveModal(false);
      fetchData();
    } catch (error) {
      console.error('Помилка збереження інклюзивної картки', error);
    }
  };

  const handlePrintInclusive = (child: ChildCard) => {
    setPrintingInclusiveChild(child);
    setTimeout(() => {
      window.print();
    }, 150);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'child_individual': return 'Індивідуальна (дитина)';
      case 'child_group': return 'Групова (діти)';
      case 'parent': return 'З батьками';
      case 'staff': return 'З персоналом';
      default: return type;
    }
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${printingInclusiveChild ? 'print:hidden' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Brain className="text-warm-600" size={28} />
            Кабінет психолога
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Психологічні профілі дітей, діагностика та протоколи консультацій
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm font-medium"
          >
            <Printer size={18} />
            Друк
          </button>
          {activeTab === 'consultations' && (
            <button 
              onClick={() => {
                setEditingConsultation(null);
                setShowConsultationModal(true);
              }}
              className="flex items-center gap-2 bg-warm-600 text-white px-4 py-2 rounded-xl hover:bg-warm-700 transition shadow-sm font-medium"
            >
              <Plus size={18} />
              Журнал консультацій
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 print:hidden">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition ${activeTab === 'profiles' ? 'bg-warm-50 text-warm-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <User size={18} />
          Психологічні профілі дітей
        </button>
        <button
          onClick={() => setActiveTab('inclusive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition ${activeTab === 'inclusive' ? 'bg-warm-50 text-warm-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <HeartHandshake size={18} />
          Інклюзивна освіта
        </button>
        <button
          onClick={() => setActiveTab('consultations')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition ${activeTab === 'consultations' ? 'bg-warm-50 text-warm-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={18} />
          Журнал консультацій
        </button>
      </div>

      {activeTab === 'profiles' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Пошук дитини за ПІБ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
              />
            </div>

            {/* Перемикач режимів перегляду */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setViewMode('groups'); setSelectedGroupId(null); }}
                className={`flex-1 sm:flex-none text-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'groups' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                За групами
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('list'); setSelectedGroupId(null); }}
                className={`flex-1 sm:flex-none text-center px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Список дітей
              </button>
            </div>
          </div>

          {/* Відображення груп, якщо пошук порожній та група не вибрана і обрано режим груп */}
          {viewMode === 'groups' && searchTerm.trim().length === 0 && selectedGroupId === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
              {groups.map((group) => {
                const groupChildrenCount = children.filter(c => c.groupId === group.id).length;
                const completedCardsCount = children.filter(c => c.groupId === group.id && c.card).length;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className="flex flex-col text-left bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-warm-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3 w-full">
                      <div className="h-10 w-10 flex items-center justify-center bg-warm-50 text-warm-600 rounded-xl group-hover:bg-warm-100 transition">
                        <AppWindow size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">Група</span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{group.name}</h3>
                    <div className="text-sm text-gray-500 font-medium">Дітей: {groupChildrenCount}</div>
                    <div className="w-full mt-4 flex items-center gap-2">
                       <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-warm-500 rounded-full" 
                           style={{ width: `${groupChildrenCount > 0 ? (completedCardsCount / groupChildrenCount) * 100 : 0}%` }}
                         />
                       </div>
                       <div className="text-xs font-bold text-gray-400 flex-shrink-0">
                         {completedCardsCount} / {groupChildrenCount} карток
                       </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Відображення таблиці дітей (якщо вибрано режим списку, або вибрано групу, або ведеться пошук) */}
          {(viewMode === 'list' || selectedGroupId !== null || searchTerm.trim().length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-200">
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 print:hidden">
                {searchTerm.trim().length === 0 && viewMode === 'groups' && selectedGroupId !== null && (
                  <button 
                    onClick={() => setSelectedGroupId(null)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <h3 className="font-bold text-gray-800">
                  {searchTerm.trim().length > 0 
                    ? `Результати пошуку: ${searchTerm}` 
                    : selectedGroupId 
                      ? `Група: ${groups.find(g => g.id === selectedGroupId)?.name}` 
                      : 'Всі діти закладу'}
                </h3>
                <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {displayChildren.length}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs font-bold font-montserrat">
                    <tr>
                      <th className="px-6 py-3">ПІБ дитини</th>
                      {searchTerm.trim().length > 0 && <th className="px-6 py-3">Група</th>}
                      <th className="px-6 py-3">Темперамент</th>
                      <th className="px-6 py-3">Адаптація</th>
                      <th className="px-6 py-3">Статус картки</th>
                      <th className="px-6 py-3 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayChildren.map(child => (
                      <tr key={child.id} className="hover:bg-warm-50/30 transition">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {child.fullName}
                          <span className="block text-xs text-gray-400 font-normal">ID: {child.id}</span>
                        </td>
                        {searchTerm.trim().length > 0 && (
                          <td className="px-6 py-4 font-medium text-gray-600">
                            {groups.find(g => g.id === child.groupId)?.name || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4">{child.card?.temperament || '—'}</td>
                        <td className="px-6 py-4">
                          {child.card?.adaptationLevel ? (
                             <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                               {child.card.adaptationLevel}
                             </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {child.card ? (
                            <span className="flex items-center gap-1.5 text-warm-600 text-xs font-bold">
                              <Brain size={14} /> Заповнена
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Немає записів</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleEditCard(child)}
                            className="text-warm-600 hover:text-warm-800 font-medium text-sm transition"
                          >
                            Відкрити картку
                          </button>
                        </td>
                      </tr>
                    ))}
                    {displayChildren.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                          Нічого не знайдено
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {consultations.map(cons => (
              <div key={cons.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group hover:border-warm-200 transition flex flex-col items-start justify-start">
                <div className="absolute top-4 right-4 text-xs font-bold text-gray-400">
                  {format(new Date(cons.date), 'dd.MM.yyyy HH:mm', { locale: uk })}
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-warm-500 mb-2">
                  {getTypeLabel(cons.consultationType)}
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">{cons.topic}</h3>
                
                {cons.childName && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mt-3 bg-gray-50 px-2.5 py-1.5 rounded-lg w-fit">
                    <User size={14} className="text-gray-400"/> {cons.childName}
                  </div>
                )}
                
                {cons.participants && (
                  <div className="mt-4 w-full pt-3 border-t border-gray-50 flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Учасники / Батьки</span>
                    <span className="text-sm font-medium text-gray-700">{cons.participants}</span>
                  </div>
                )}
                
                <div className="mt-auto pt-4 w-full">
                  <div className="bg-warm-50/50 p-3 rounded-xl text-sm text-gray-700 leading-relaxed border border-warm-100/30 min-h-[4rem]">
                    {cons.notes || <span className="italic text-gray-400">Без додаткових нотаток</span>}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleEditConsultation(cons)}
                      className="text-sm font-medium text-warm-600 transition hover:text-warm-800"
                    >
                      Редагувати
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {consultations.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Brain size={48} className="mx-auto text-gray-50 md-mb-3" />
                <p>Записів консультацій ще немає.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inclusive' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Фільтри */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Пошук дитини за ПІБ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Фільтр по групі */}
              <div className="w-full sm:w-44">
                <CustomSelect
                  options={[
                    { id: '', name: 'Усі групи' },
                    ...groups.map(g => ({ id: g.id, name: g.name }))
                  ]}
                  value={selectedGroupId ? String(selectedGroupId) : ''}
                  onChange={(val) => setSelectedGroupId(val ? Number(val) : null)}
                />
              </div>

              {/* Фільтр по рівню підтримки */}
              <div className="w-full sm:w-44">
                <CustomSelect
                  options={[
                    { id: 'all', name: 'Усі рівні' },
                    { id: '1', name: '1 рівень підтримки' },
                    { id: '2', name: '2 рівень підтримки' },
                    { id: '3', name: '3 рівень підтримки' },
                    { id: '4', name: '4 рівень підтримки' },
                    { id: '5', name: '5 рівень підтримки' },
                  ]}
                  value={selectedSupportLevelFilter}
                  onChange={(val) => setSelectedSupportLevelFilter(String(val))}
                />
              </div>

              {/* Перемикач тільки ООП */}
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600 select-none ml-2">
                <input
                  type="checkbox"
                  checked={showOnlyInclusiveOnRegister}
                  onChange={(e) => setShowOnlyInclusiveOnRegister(e.target.checked)}
                  className="rounded text-warm-600 focus:ring-warm-500/20 w-4 h-4"
                />
                Тільки діти ООП
              </label>
            </div>
          </div>

          {/* Таблиця */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs font-bold font-montserrat">
                  <tr>
                    <th className="px-6 py-3">ПІБ дитини</th>
                    <th className="px-6 py-3">Група</th>
                    <th className="px-6 py-3">Рівень підтримки</th>
                    <th className="px-6 py-3">Особливі потреби</th>
                    <th className="px-6 py-3 text-center">Годин / тиж.</th>
                    <th className="px-6 py-3">Індивідуальна програма</th>
                    <th className="px-6 py-3 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    let filtered = inclusiveChildren;
                    
                    // Пошук
                    if (searchTerm.trim()) {
                      filtered = filtered.filter(c => c.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
                    }
                    
                    // Група
                    if (selectedGroupId) {
                      filtered = filtered.filter(c => c.groupId === selectedGroupId);
                    }
                    
                    // Тільки ООП
                    if (showOnlyInclusiveOnRegister) {
                      filtered = filtered.filter(c => c.inclusiveCard !== null);
                    }
                    
                    // Рівень підтримки
                    if (selectedSupportLevelFilter !== 'all') {
                      filtered = filtered.filter(c => c.inclusiveCard?.supportLevel === Number(selectedSupportLevelFilter));
                    }

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <HeartHandshake className="text-gray-300" size={48} />
                              <p className="font-semibold text-gray-500">
                                {showOnlyInclusiveOnRegister 
                                  ? 'Дітей на обліку ООП за вказаними фільтрами не знайдено'
                                  : 'Дітей за вказаними фільтрами не знайдено'}
                              </p>
                              {showOnlyInclusiveOnRegister && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowOnlyInclusiveOnRegister(false);
                                    setSelectedSupportLevelFilter('all');
                                    setSelectedGroupId(null);
                                  }}
                                  className="mt-2 text-xs font-bold text-warm-600 hover:text-warm-700 bg-warm-50 border border-warm-100 px-4 py-2 rounded-xl hover:bg-warm-100 transition shadow-sm"
                                >
                                  Показати всіх дітей закладу для створення картки ООП / ІПР
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(child => {
                      const level = child.inclusiveCard?.supportLevel || 0;
                      let badgeColor = "bg-gray-100 text-gray-700";
                      if (level === 1) badgeColor = "bg-slate-100 text-slate-700 border border-slate-200";
                      else if (level === 2) badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                      else if (level === 3) badgeColor = "bg-blue-50 text-blue-700 border border-blue-200";
                      else if (level === 4) badgeColor = "bg-amber-50 text-amber-700 border border-amber-200";
                      else if (level === 5) badgeColor = "bg-rose-50 text-rose-700 border border-rose-200";

                      return (
                        <tr key={child.id} className="hover:bg-warm-50/30 transition">
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {child.fullName}
                            <span className="block text-xs text-gray-400 font-normal">ID: {child.id}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-600">
                            {groups.find(g => g.id === child.groupId)?.name || '—'}
                          </td>
                          <td className="px-6 py-4">
                            {child.inclusiveCard ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                                {level} рівень
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Не на обліку</span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-[200px] truncate">
                            {child.inclusiveCard?.specialNeeds || '—'}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-700">
                            {child.inclusiveCard?.weeklyHours !== undefined ? `${child.inclusiveCard.weeklyHours} год.` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {child.inclusiveCard?.individualProgram ? (
                              <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Складено
                              </span>
                            ) : child.inclusiveCard ? (
                              <span className="text-gray-400 text-xs italic">Не заповнено</span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleEditInclusive(child)}
                              className="text-warm-600 hover:text-warm-800 font-bold text-sm transition"
                            >
                              {child.inclusiveCard ? 'Редагувати ІПР' : 'Створити картку'}
                            </button>
                            {child.inclusiveCard && (
                              <button
                                onClick={() => handlePrintInclusive(child)}
                                className="text-gray-500 hover:text-gray-700 font-bold text-sm transition inline-flex items-center gap-1"
                              >
                                <Printer size={14} /> Друк
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {showCardModal && selectedChild && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Психологічна картка</h3>
                <p className="text-sm text-gray-500">{selectedChild.fullName}</p>
              </div>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-red-500 transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Темперамент</label>
                  <input 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                    value={cardForm.temperament} onChange={e => setCardForm({...cardForm, temperament: e.target.value})} 
                    placeholder="Напр. Сангвінік"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Рівень адаптації</label>
                  <CustomSelect 
                    options={[
                      { id: '', name: 'Не визначено' },
                      { id: 'Високий', name: 'Високий' },
                      { id: 'Середній', name: 'Середній' },
                      { id: 'Низький', name: 'Низький' },
                    ]}
                    value={cardForm.adaptationLevel} onChange={val => setCardForm({...cardForm, adaptationLevel: String(val)})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Розвиток мовлення та уважності</label>
                  <textarea 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                    rows={2} value={cardForm.speechDevelopment} onChange={e => setCardForm({...cardForm, speechDevelopment: e.target.value})} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Соціальні навички у групі</label>
                  <textarea 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                    rows={2} value={cardForm.socialSkills} onChange={e => setCardForm({...cardForm, socialSkills: e.target.value})} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Статус сім'ї / атмосфера</label>
                  <input 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                    value={cardForm.familyStatus} onChange={e => setCardForm({...cardForm, familyStatus: e.target.value})} 
                    placeholder="Напр. Повна сім'я, позитивна атмосфера"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Примітки / Висновки психолога</label>
                  <textarea 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                    rows={4} value={cardForm.notes} onChange={e => setCardForm({...cardForm, notes: e.target.value})} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Рекомендації для БАТЬКІВ (видно у додатку)</label>
                  <textarea 
                    className="w-full px-3 py-2.5 border-2 border-red-100 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition text-sm text-red-700 font-medium" 
                    rows={4} value={cardForm.recommendations} onChange={e => setCardForm({...cardForm, recommendations: e.target.value})} 
                    placeholder="Ці нотатки будуть виділені червоним кольором в особовій справі..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 mt-auto">
              <button 
                onClick={() => setShowCardModal(false)} 
                className="px-5 py-2.5 font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition shadow-sm"
              >
                Скасувати
              </button>
              <button 
                onClick={handleSaveCard} 
                className="flex items-center gap-2 bg-warm-600 font-medium text-white px-6 py-2.5 rounded-xl hover:bg-warm-700 shadow-sm transition"
              >
                <Save size={18} /> Зберегти картку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Modal */}
      {showConsultationModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col pt-2">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">
                {editingConsultation ? 'Редагування консультації' : 'Новий запис консультації'}
              </h3>
              <button onClick={handleCloseConsultationModal} className="text-gray-400 hover:text-red-500 transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Тип консультації</label>
                <CustomSelect 
                  options={[
                    { id: 'child_individual', name: 'Індивідуальна з дитиною' },
                    { id: 'child_group', name: 'Групова робота (діти)' },
                    { id: 'parent', name: 'Робота з батьками' },
                    { id: 'staff', name: 'Консультація для персоналу' },
                  ]}
                  value={consultationForm.consultationType} 
                  onChange={val => setConsultationForm({...consultationForm, consultationType: String(val)})}
                />
              </div>

              {['child_individual', 'parent'].includes(consultationForm.consultationType) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Дитина (необов'язково)</label>
                  <div className="z-40 relative">
                    <CustomSelect 
                      options={[
                        { id: '', name: 'Не обрано' },
                        ...children.map(c => ({ id: c.id, name: c.fullName }))
                      ]}
                      value={consultationForm.childId} 
                      onChange={val => setConsultationForm({...consultationForm, childId: String(val)})}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Тема / Причина звернення</label>
                <input 
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                  value={consultationForm.topic} onChange={e => setConsultationForm({...consultationForm, topic: e.target.value})} 
                  placeholder="Коротка тема..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Учасники (ПІБ батьків, вихователя тощо)</label>
                <input 
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                  value={consultationForm.participants} onChange={e => setConsultationForm({...consultationForm, participants: e.target.value})} 
                  placeholder="..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Дата та час</label>
                <input 
                  type="datetime-local"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                  value={consultationForm.date} onChange={e => setConsultationForm({...consultationForm, date: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Результат / Нотатки</label>
                <textarea 
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm" 
                  rows={3} value={consultationForm.notes} onChange={e => setConsultationForm({...consultationForm, notes: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 mt-auto">
              <button 
                onClick={handleCloseConsultationModal} 
                className="px-5 py-2.5 font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition shadow-sm"
              >
                Скасувати
              </button>
              <button 
                onClick={handleSaveConsultation} 
                className="flex items-center gap-2 bg-warm-600 font-medium text-white px-6 py-2.5 rounded-xl hover:bg-warm-700 shadow-sm transition"
              >
                <Save size={18} /> {editingConsultation ? 'Зберегти зміни' : 'Зберегти протокол'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inclusive Card Modal */}
      {showInclusiveModal && selectedInclusiveChild && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <HeartHandshake className="text-warm-600" size={22} />
                  Інклюзивна картка дитини ООП / ІПР
                </h3>
                <p className="text-sm text-gray-500">{selectedInclusiveChild.fullName}</p>
              </div>
              <button onClick={() => setShowInclusiveModal(false)} className="text-gray-400 hover:text-red-500 transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Рівень підтримки в ЗДО</label>
                  <CustomSelect
                    options={[
                      { id: '1', name: '1 рівень підтримки' },
                      { id: '2', name: '2 рівень підтримки' },
                      { id: '3', name: '3 рівень підтримки' },
                      { id: '4', name: '4 рівень підтримки' },
                      { id: '5', name: '5 рівень підтримки' },
                    ]}
                    value={String(inclusiveForm.supportLevel)}
                    onChange={val => setInclusiveForm({...inclusiveForm, supportLevel: Number(val)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Годин занять на тиждень (фахівці)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    value={inclusiveForm.weeklyHours}
                    onChange={e => setInclusiveForm({...inclusiveForm, weeklyHours: Number(e.target.value)})}
                    placeholder="Напр. 3"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Особливі освітні потреби (діагноз, висновок ІРЦ)</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    rows={3}
                    value={inclusiveForm.specialNeeds}
                    onChange={e => setInclusiveForm({...inclusiveForm, specialNeeds: e.target.value})}
                    placeholder="Наприклад: порушення мовлення важкого ступеня..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Склад команди індивідуального супроводу</label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    value={inclusiveForm.teamMembers}
                    onChange={e => setInclusiveForm({...inclusiveForm, teamMembers: e.target.value})}
                    placeholder="Вихователь, психолог, логопед, батьки..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Адаптація та модифікація освітнього середовища</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    rows={2}
                    value={inclusiveForm.adaptationNeeds}
                    onChange={e => setInclusiveForm({...inclusiveForm, adaptationNeeds: e.target.value})}
                    placeholder="Збільшені картки, спеціальне освітлення, тиха зона..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Індивідуальна програма розвитку (цілі та завдання)</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    rows={4}
                    value={inclusiveForm.individualProgram}
                    onChange={e => setInclusiveForm({...inclusiveForm, individualProgram: e.target.value})}
                    placeholder="Цілі розвитку: розвиток мовленнєвої активності, покращення координації..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Моніторинг динаміки розвитку та примітки</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 transition text-sm"
                    rows={3}
                    value={inclusiveForm.notes}
                    onChange={e => setInclusiveForm({...inclusiveForm, notes: e.target.value})}
                    placeholder="Результати спостережень психолога та вихователів..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 mt-auto">
              <button
                onClick={() => setShowInclusiveModal(false)}
                className="px-5 py-2.5 font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition shadow-sm"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveInclusive}
                className="flex items-center gap-2 bg-warm-600 font-medium text-white px-6 py-2.5 rounded-xl hover:bg-warm-700 shadow-sm transition"
              >
                <Save size={18} /> Зберегти зміни
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Печатна форма ІПР (Индивидуальной программы развития) */}
      {printingInclusiveChild && printingInclusiveChild.inclusiveCard && (
        <div className="hidden print:block bg-white text-black p-8 text-[12px] leading-5 font-sans">
          <div className="text-center mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ЗАКЛАД ДОШКІЛЬНОЇ ОСВІТИ</h3>
            <h1 className="text-lg font-black mt-2 text-gray-800 uppercase leading-snug">
              Індивідуальна програма розвитку дитини
            </h1>
            <p className="text-sm font-bold text-warm-600 mt-1">
              з особливими освітніми потребами (ООП / ІПР)
            </p>
            <div className="w-32 h-1 bg-warm-600 mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-4 border border-gray-200 p-4 rounded-xl mb-6 bg-gray-50/50">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Прізвище, ім'я, по батькові дитини</span>
              <div className="text-sm font-black text-gray-800">{printingInclusiveChild.fullName}</div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Дата народження / Вік</span>
              <div className="text-sm font-bold text-gray-700">
                {printingInclusiveChild.birthDate ? format(new Date(printingInclusiveChild.birthDate), 'dd.MM.yyyy') : '—'}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Група перебування</span>
              <div className="text-sm font-bold text-gray-700">
                {groups.find(g => g.id === printingInclusiveChild.groupId)?.name || '—'}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Рівень підтримки</span>
              <div className="text-sm font-black text-warm-700">
                {printingInclusiveChild.inclusiveCard.supportLevel} рівень підтримки
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                1. Особливі освітні потреби (висновок ІРЦ, категорія ООП)
              </h4>
              <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed font-medium bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.specialNeeds || 'Не вказано'}
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                2. Склад команди індивідуального супроводу дитини
              </h4>
              <p className="text-[11px] text-gray-700 font-medium bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.teamMembers || 'Не вказано'}
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                3. Години додаткових занять на тиждень (робота фахівців)
              </h4>
              <p className="text-[11px] text-gray-700 font-bold bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.weeklyHours ? `${printingInclusiveChild.inclusiveCard.weeklyHours} год. / тиждень` : 'Не вказано'}
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                4. Адаптація та модифікація освітнього простору/матеріалів
              </h4>
              <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed font-medium bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.adaptationNeeds || 'Не вказано'}
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                5. Індивідуальний навчальний план, цілі та завдання розвитку
              </h4>
              <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed font-medium bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.individualProgram || 'Не вказано'}
              </p>
            </div>

            <div className="pb-4">
              <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider mb-2">
                6. Моніторинг динаміки розвитку та особливі примітки
              </h4>
              <p className="text-[11px] text-gray-700 whitespace-pre-line leading-relaxed font-medium bg-gray-50/30 p-3 rounded-lg border border-gray-100">
                {printingInclusiveChild.inclusiveCard.notes || 'Не вказано'}
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8 text-[10px] font-bold text-gray-600">
              <div className="space-y-4">
                <div>Психолог ЗДО: _______________________ (підпис)</div>
                <div>Вихователь групи: ____________________ (підпис)</div>
              </div>
              <div className="space-y-4">
                <div>Батьки / Опікуни: ____________________ (підпис)</div>
                <div>Директор ЗДО: _______________________ (підпис)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsychologistPage;
