import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../api/axios';
import CustomSelect from '../../../components/ui/CustomSelect';
import ChildQRCode from '../../../components/children/ChildQRCode';
import { 
  X, Archive,
  User, Users, Stethoscope, Brain, QrCode, 
  MapPin, Phone, FileText, Info, Save, Printer, Camera,
  AlertCircle, CheckCircle2
} from 'lucide-react';

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  groupName: string;
  status: string;
  qrToken?: string;
  gender?: string;
  address?: string;
  documentInfo?: string;
  motherName?: string;
  motherPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  hasBenefits?: boolean;
  benefitDescription?: string;
  photoPath?: string;
  enrollmentDate?: string;
  notes?: string;
}

interface MedicalCardModalProps {
  child: Child;
  onClose: () => void;
  onArchived: () => void;
}

interface MedicalMeasurement {
  id: number;
  height: number | null;
  weight: number | null;
  measuredAt: string;
  notes?: string | null;
}

interface ChildMedicalCard {
  bloodGroup?: string | null;
  rhFactor?: string | null;
  healthGroup?: string | null;
  physicalGroup?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  dietaryRestrictions?: string | null;
  height?: number | null;
  weight?: number | null;
}

interface ChildMedicalDetails {
  child: Child | null;
  illnesses: any[];
  vaccinations: any[];
  card: ChildMedicalCard | null;
  measurements: MedicalMeasurement[];
  psychCard: any;
  qrToken: string | null;
}

type Notice = {
  type: 'success' | 'error';
  message: string;
};

const MedicalCardModal: React.FC<MedicalCardModalProps> = ({ child, onClose, onArchived }) => {
  const [data, setData] = useState<ChildMedicalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'family' | 'medical' | 'psychology' | 'qr'>('general');
  const [editingCard, setEditingCard] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingMeasurement, setAddingMeasurement] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Вибув із закладу');

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('uk-UA');
  };

  const formatMeasurementValue = (value?: number | null, suffix?: string) => {
    if (value === undefined || value === null) return '—';
    return `${value}${suffix ? ` ${suffix}` : ''}`;
  };

  const getVaccinationStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'done':
        return 'Виконано';
      case 'planned':
        return 'Заплановано';
      case 'exempt':
        return 'Медвідвід';
      default:
        return status || '—';
    }
  };

  const getVaccinationStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700';
      case 'planned':
        return 'bg-amber-100 text-amber-700';
      case 'exempt':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };
  
  // Controlled state for form fields (Medical + Personal + Family)
  const [cardForm, setCardForm] = useState({
    // Medical
    bloodGroup: '', rhFactor: '', healthGroup: '', physicalGroup: '',
    allergies: '', chronicConditions: '', dietaryRestrictions: '',
    height: '', weight: '',
    // Personal/General
    fullName: '', birthDate: '',
    gender: '', address: '', documentInfo: '',
    motherName: '', motherPhone: '',
    fatherName: '', fatherPhone: '',
    hasBenefits: false,
    benefitDescription: '',
    enrollmentDate: '', notes: '',
    // Psychology
    temperament: '', adaptationLevel: '', speechDevelopment: '', 
    socialSkills: '', familyStatus: '', psychNotes: '', recommendations: ''
  });
  const [measurementForm, setMeasurementForm] = useState({
    measuredAt: new Date().toISOString().slice(0, 16),
    height: '',
    weight: '',
    notes: '',
  });

  useEffect(() => {
    fetchCard();
  }, [child.id]);

  const fetchCard = async () => {
    setNotice(null);
    try {
      const res = await api.get(`/medical/children/${child.id}`);
      setData(res.data);
      
      const c = res.data.child || child;
      const m = res.data.card || {};

      setCardForm({
        bloodGroup: m.bloodGroup || '',
        rhFactor: m.rhFactor || '',
        healthGroup: m.healthGroup || '',
        physicalGroup: m.physicalGroup || '',
        allergies: m.allergies || '',
        chronicConditions: m.chronicConditions || '',
        dietaryRestrictions: m.dietaryRestrictions || '',
        height: m.height?.toString() || '',
        weight: m.weight?.toString() || '',
        fullName: c.fullName || '',
        birthDate: c.birthDate ? new Date(c.birthDate).toISOString().slice(0, 10) : '',
        gender: c.gender || '',
        address: c.address || '',
        documentInfo: c.documentInfo || '',
        motherName: c.motherName || '',
        motherPhone: c.motherPhone || '',
        fatherName: c.fatherName || '',
        fatherPhone: c.fatherPhone || '',
        hasBenefits: Boolean(c.hasBenefits),
        benefitDescription: c.benefitDescription || '',
        enrollmentDate: c.enrollmentDate ? new Date(c.enrollmentDate).toISOString().slice(0, 10) : '',
        notes: c.notes || '',
        // Psychology
        temperament: res.data.psychCard?.temperament || '',
        adaptationLevel: res.data.psychCard?.adaptationLevel || '',
        speechDevelopment: res.data.psychCard?.speechDevelopment || '',
        socialSkills: res.data.psychCard?.socialSkills || '',
        familyStatus: res.data.psychCard?.familyStatus || '',
        psychNotes: res.data.psychCard?.notes || '',
        recommendations: res.data.psychCard?.recommendations || ''
      });
    } catch (err) {
      console.error('Failed to load card', err);
      setNotice({ type: 'error', message: 'Не вдалося завантажити дані картки' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCard(true);
    setNotice(null);

    if (!child?.id) {
      setNotice({ type: 'error', message: 'Помилка: ID дитини не знайдено. Збереження неможливе.' });
      setSavingCard(false);
      return;
    }

    try {
      console.log(`[Save] Starting full save for child ${child.id}`);

      // 1. Save Medical Card
      const medicalPayload = {
        bloodGroup: cardForm.bloodGroup,
        rhFactor: cardForm.rhFactor,
        healthGroup: cardForm.healthGroup,
        physicalGroup: cardForm.physicalGroup,
        allergies: cardForm.allergies,
        chronicConditions: cardForm.chronicConditions,
        dietaryRestrictions: cardForm.dietaryRestrictions,
        height: (cardForm.height && cardForm.height.trim() !== '') ? parseFloat(cardForm.height) : null,
        weight: (cardForm.weight && cardForm.weight.trim() !== '') ? parseFloat(cardForm.weight) : null
      };
      try {
        await api.put(`/medical/children/${child.id}/card`, medicalPayload);
        console.log('[Save] ✅ Medical card saved');
      } catch (e: any) {
        throw new Error(`[Медична картка] ${e.response?.status} ${e.config?.method?.toUpperCase()} ${e.config?.url}: ${e.response?.data?.message || e.message}`);
      }

      // 2. Save Psychologist Card
      const psychPayload = {
        childId: child.id,
        temperament: cardForm.temperament,
        adaptationLevel: cardForm.adaptationLevel,
        speechDevelopment: cardForm.speechDevelopment,
        socialSkills: cardForm.socialSkills,
        familyStatus: cardForm.familyStatus,
        notes: cardForm.psychNotes,
        recommendations: cardForm.recommendations
      };
      try {
        await api.post('/psychologist/cards', psychPayload);
        console.log('[Save] ✅ Psychologist card saved');
      } catch (e: any) {
        throw new Error(`[Психолог] ${e.response?.status} ${e.config?.method?.toUpperCase()} ${e.config?.url}: ${e.response?.data?.message || e.message}`);
      }

      // 3. Save Personal/Family details
      const personalPayload = {
        fullName: cardForm.fullName?.trim() || '',
        birthDate: cardForm.birthDate || '',
        gender: cardForm.gender || '',
        address: cardForm.address?.trim() || '',
        documentInfo: cardForm.documentInfo?.trim() || '',
        motherName: cardForm.motherName?.trim() || '',
        motherPhone: cardForm.motherPhone?.trim() || '',
        fatherName: cardForm.fatherName?.trim() || '',
        fatherPhone: cardForm.fatherPhone?.trim() || '',
        hasBenefits: Boolean(cardForm.hasBenefits),
        benefitDescription: cardForm.benefitDescription?.trim() || '',
        enrollmentDate: cardForm.enrollmentDate || null,
        notes: cardForm.notes?.trim() || ''
      };
      try {
        await api.patch(`/children/${child.id}`, personalPayload);
        console.log('[Save] ✅ Personal details saved');
      } catch (e: any) {
        throw new Error(`[Особові дані] ${e.response?.status} ${e.config?.method?.toUpperCase()} ${e.config?.url}: ${e.response?.data?.message || e.message}`);
      }

      await fetchCard();
      setEditingCard(false);
      setNotice({ type: 'success', message: 'Особову справу успішно оновлено' });
    } catch (err: any) {
      console.error('Save failed:', err.message);
      setNotice({ type: 'error', message: `Помилка збереження: ${err.message}` });
    } finally {
      setSavingCard(false);
    }
  };

  const requestArchive = () => {
    setArchiveReason('Вибув із закладу');
    setIsArchiveConfirmOpen(true);
  };

  const handleArchive = async () => {
    const reason = archiveReason.trim() || 'Вибув із закладу';
    setNotice(null);
    try {
      await api.patch(`/children/${child.id}/archive`, { reason });
      setIsArchiveConfirmOpen(false);
      onArchived();
      onClose();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: 'Помилка архівації' });
    }
  };

  const startEditing = () => {
    setEditingCard(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    setUploadingPhoto(true);
    setNotice(null);

    try {
      await api.post(`/children/${child.id}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchCard();
      setNotice({ type: 'success', message: 'Фото дитини оновлено' });
    } catch (error) {
      console.error('Failed to upload child photo', error);
      setNotice({ type: 'error', message: 'Не вдалося завантажити фото дитини' });
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleAddMeasurement = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddingMeasurement(true);
    setNotice(null);

    try {
      await api.post(`/medical/children/${child.id}/measurements`, {
        measuredAt: measurementForm.measuredAt,
        height: measurementForm.height.trim() ? Number(measurementForm.height) : null,
        weight: measurementForm.weight.trim() ? Number(measurementForm.weight) : null,
        notes: measurementForm.notes.trim(),
      });

      setMeasurementForm({
        measuredAt: new Date().toISOString().slice(0, 16),
        height: '',
        weight: '',
        notes: '',
      });
      await fetchCard();
      setNotice({ type: 'success', message: 'Антропометричний запис додано' });
    } catch (error) {
      console.error('Failed to create measurement', error);
      setNotice({ type: 'error', message: 'Не вдалося додати антропометрію' });
    } finally {
      setAddingMeasurement(false);
    }
  };

  const genderOptions = [
    { id: '', name: 'Не вказано' },
    { id: 'Хлопчик', name: 'Хлопчик' },
    { id: 'Дівчинка', name: 'Дівчинка' },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-8 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-warm-100 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 print:hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-none">{child.fullName}</h2>
            <div className="flex items-center gap-2 mt-3 text-sm font-bold text-gray-400">
              <span className="bg-warm-100 text-warm-700 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Група: {child.groupName || '—'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <span>Народився: {formatDate(child.birthDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-sm font-black text-slate-600 hover:text-white hover:bg-slate-700 border-2 border-slate-100 hover:border-slate-700 px-4 py-2 rounded-2xl transition-all"
            >
              <Printer size={18} />
              <span>ДРУК СПРАВИ</span>
            </button>
            {child.status === 'active' && (
              <button
                onClick={requestArchive}
                className="flex items-center gap-2 text-sm font-black text-orange-600 hover:text-white hover:bg-orange-600 border-2 border-orange-100 hover:border-orange-600 px-4 py-2 rounded-2xl transition-all"
              >
                <Archive size={18} />
                <span>В АРХІВ</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-all shadow-sm"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {notice && (
          <div className={`mx-8 mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            notice.type === 'error'
              ? 'border-red-100 bg-red-50 text-red-700'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}>
            {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {notice.message}
          </div>
        )}

        {isArchiveConfirmOpen && (
          <div className="absolute inset-0 z-[10001] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2rem] border border-orange-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
                  <Archive size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800">Архівація картки</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Відправити картку "{child.fullName}" до архіву?
                  </p>
                </div>
              </div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Причина архівації</label>
              <textarea
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                className="ui-input min-h-[96px] w-full"
                placeholder="Наприклад: випуск, переїзд, переведення"
                autoFocus
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsArchiveConfirmOpen(false)}
                  className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 font-bold text-white transition hover:bg-orange-700"
                >
                  <Archive size={18} />
                  В архів
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {loading ? (
            <div className="text-center text-gray-500 py-20 font-bold animate-pulse">Завантаження даних...</div>
          ) : !data ? (
            <div className="text-center text-red-500 py-20 font-bold">Помилка завантаження даних</div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex bg-gray-50 border-b border-gray-100 px-8 sticky top-0 z-20">
                {[
                  { id: 'general', name: 'Особова справа', icon: User },
                  { id: 'family', name: 'Родина', icon: Users },
                  { id: 'medical', name: 'Медицина', icon: Stethoscope },
                  { id: 'psychology', name: 'Психолог', icon: Brain },
                  { id: 'qr', name: 'Доступ (QR)', icon: QrCode },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-4 transition-all font-bold text-sm ${
                      activeSubTab === tab.id 
                        ? 'border-warm-600 text-warm-700 bg-white' 
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="p-8 flex-1">
                {editingCard ? (
                  <form onSubmit={handleSaveAll} className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    {activeSubTab === 'general' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="md:col-span-2 flex items-center gap-2 mb-2">
                           <Info size={18} className="text-warm-500" />
                           <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Персональні дані</h3>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Повне ім'я дитини</label>
                          <input value={cardForm.fullName} onChange={(e) => setCardForm({ ...cardForm, fullName: e.target.value })} className="ui-input w-full" placeholder="Прізвище Ім'я По батькові" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Дата народження</label>
                          <input type="date" value={cardForm.birthDate} onChange={(e) => setCardForm({ ...cardForm, birthDate: e.target.value })} className="ui-input w-full" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Стать</label>
                          <CustomSelect
                            options={genderOptions}
                            value={cardForm.gender}
                            onChange={(v) => setCardForm({ ...cardForm, gender: String(v) })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Свідоцтво про народження (серія, номер)</label>
                          <input value={cardForm.documentInfo} onChange={(e) => setCardForm({ ...cardForm, documentInfo: e.target.value })} className="ui-input w-full" placeholder="АА № 000000" />
                        </div>
                         <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Адреса проживання</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input value={cardForm.address} onChange={(e) => setCardForm({ ...cardForm, address: e.target.value })} className="ui-input w-full pl-10" placeholder="Вулиця, будинок, квартира" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Дата зарахування</label>
                          <input type="date" value={cardForm.enrollmentDate} onChange={(e) => setCardForm({ ...cardForm, enrollmentDate: e.target.value })} className="ui-input w-full" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Наявність пільг</label>
                          <CustomSelect
                            options={[
                              { id: 'false', name: 'Немає' },
                              { id: 'true', name: 'Є пільги' },
                            ]}
                            value={String(cardForm.hasBenefits)}
                            onChange={(value) => setCardForm({ ...cardForm, hasBenefits: String(value) === 'true' })}
                          />
                        </div>
                         <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Опис пільг</label>
                           <textarea
                             value={cardForm.benefitDescription}
                             onChange={(e) => setCardForm({ ...cardForm, benefitDescription: e.target.value })}
                            className="ui-input w-full min-h-[90px]"
                            placeholder="Наприклад: багатодітна сім'я, пільга на харчування, посвідчення..."
                           />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Фото дитини</label>
                          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-bold text-gray-600 transition hover:border-warm-400 hover:text-warm-700">
                            <Camera size={18} />
                            {uploadingPhoto ? 'Завантаження фото...' : 'Завантажити або замінити фото'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Адміністративні нотатки</label>
                           <textarea value={cardForm.notes} onChange={(e) => setCardForm({ ...cardForm, notes: e.target.value })} className="ui-input w-full min-h-[100px]" placeholder="..." />
                        </div>
                      </div>
                    )}

                    {activeSubTab === 'family' && (
                      <div className="space-y-6">
                        <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 flex items-center gap-2 mb-2 font-bold text-emerald-800">
                             <User size={18} /> МАТИ
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-600 mb-1.5 uppercase">ПІБ Матері</label>
                            <input value={cardForm.motherName} onChange={(e) => setCardForm({ ...cardForm, motherName: e.target.value })} className="ui-input w-full border-emerald-100" placeholder="Прізвище Ім'я По батькові" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-600 mb-1.5 uppercase">Телефон</label>
                            <input value={cardForm.motherPhone} onChange={(e) => setCardForm({ ...cardForm, motherPhone: e.target.value })} className="ui-input w-full border-emerald-100" placeholder="+380..." />
                          </div>
                        </div>

                        <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 flex items-center gap-2 mb-2 font-bold text-blue-800">
                             <User size={18} /> БАТЬКО
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-blue-600 mb-1.5 uppercase">ПІБ Батька</label>
                            <input value={cardForm.fatherName} onChange={(e) => setCardForm({ ...cardForm, fatherName: e.target.value })} className="ui-input w-full border-blue-100" placeholder="Прізвище Ім'я По батькові" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-blue-600 mb-1.5 uppercase">Телефон</label>
                            <input value={cardForm.fatherPhone} onChange={(e) => setCardForm({ ...cardForm, fatherPhone: e.target.value })} className="ui-input w-full border-blue-100" placeholder="+380..." />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSubTab === 'medical' && (
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Група крові</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'I(0)',name:'I(0)'},{id:'II(A)',name:'II(A)'},{id:'III(B)',name:'III(B)'},{id:'IV(AB)',name:'IV(AB)'}]}
                             value={cardForm.bloodGroup}
                             onChange={(v) => setCardForm({ ...cardForm, bloodGroup: String(v) })}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Резус-фактор</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'+ (позитивний)',name:'+ (позитивний)'},{id:'- (негативний)',name:'- (негативний)'}]}
                             value={cardForm.rhFactor}
                             onChange={(v) => setCardForm({ ...cardForm, rhFactor: String(v) })}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Група здоров'я</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'I',name:'I'},{id:'II',name:'II'},{id:'III',name:'III'},{id:'IV',name:'IV'},{id:'V',name:'V'}]}
                             value={cardForm.healthGroup}
                             onChange={(v) => setCardForm({ ...cardForm, healthGroup: String(v) })}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Фізкультурна група</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'Основна',name:'Основна'},{id:'Підготовча',name:'Підготовча'},{id:'Спеціальна',name:'Спеціальна'}]}
                             value={cardForm.physicalGroup}
                             onChange={(v) => setCardForm({ ...cardForm, physicalGroup: String(v) })}
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase text-red-600">Алергії</label>
                           <input value={cardForm.allergies} onChange={(e) => setCardForm({ ...cardForm, allergies: e.target.value })} className="ui-input w-full border-red-100" placeholder="Перелік або 'Немає'" />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Хронічні захворювання</label>
                           <input value={cardForm.chronicConditions} onChange={(e) => setCardForm({ ...cardForm, chronicConditions: e.target.value })} className="ui-input w-full" />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Особливості дієти (Стіл)</label>
                           <input value={cardForm.dietaryRestrictions} onChange={(e) => setCardForm({ ...cardForm, dietaryRestrictions: e.target.value })} className="ui-input w-full" placeholder="Наприклад: Стіл №5, Безлактозна дієта" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Зріст (см)</label>
                           <input type="number" step="0.1" value={cardForm.height} onChange={(e) => setCardForm({ ...cardForm, height: e.target.value })} className="ui-input w-full" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Вага (кг)</label>
                           <input type="number" step="0.1" value={cardForm.weight} onChange={(e) => setCardForm({ ...cardForm, weight: e.target.value })} className="ui-input w-full" />
                        </div>
                      </div>
                    )}

                    {activeSubTab === 'psychology' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="md:col-span-2 flex items-center gap-2 mb-2">
                           <Brain size={18} className="text-warm-500" />
                           <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">Психологічний профіль</h3>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Темперамент</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'Сангвінік',name:'Сангвінік'},{id:'Холерик',name:'Холерик'},{id:'Флегматик',name:'Флегматик'},{id:'Меланхолік',name:'Меланхолік'}]}
                             value={cardForm.temperament}
                             onChange={(v) => setCardForm({ ...cardForm, temperament: String(v) })}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Рівень адаптації</label>
                           <CustomSelect
                             options={[{id:'',name:'Не вказано'},{id:'Високий',name:'Високий'},{id:'Середній',name:'Середній'},{id:'Низький',name:'Низький'},{id:'Важка адаптація',name:'Важка адаптація'}]}
                             value={cardForm.adaptationLevel}
                             onChange={(v) => setCardForm({ ...cardForm, adaptationLevel: String(v) })}
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Мовленнєвий розвиток</label>
                           <textarea value={cardForm.speechDevelopment} onChange={(e) => setCardForm({ ...cardForm, speechDevelopment: e.target.value })} className="ui-input w-full min-h-[80px]" placeholder="Опишіть рівень розвитку мовлення..." />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Соціальні навички</label>
                           <textarea value={cardForm.socialSkills} onChange={(e) => setCardForm({ ...cardForm, socialSkills: e.target.value })} className="ui-input w-full min-h-[80px]" placeholder="Взаємодія з однолітками та дорослими..." />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Статус сім'ї (психологічний)</label>
                           <input value={cardForm.familyStatus} onChange={(e) => setCardForm({ ...cardForm, familyStatus: e.target.value })} className="ui-input w-full" placeholder="Наприклад: Сприятливий клімат, Потребує уваги" />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Внутрішні нотатки психолога</label>
                           <textarea value={cardForm.psychNotes} onChange={(e) => setCardForm({ ...cardForm, psychNotes: e.target.value })} className="ui-input w-full min-h-[100px]" placeholder="Конфіденційні нотатки..." />
                        </div>
                        <div className="md:col-span-2 p-6 bg-red-50 rounded-2xl border-2 border-dashed border-red-100">
                           <label className="block text-sm font-black text-red-600 mb-2 uppercase">🚩 Рекомендації для батьків</label>
                           <textarea value={cardForm.recommendations} onChange={(e) => setCardForm({ ...cardForm, recommendations: e.target.value })} className="ui-input w-full min-h-[120px] border-red-200 text-red-700 font-bold" placeholder="Ці поради будуть виділені червоним у додатку батьків..." />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                       <p className="text-xs text-gray-400 font-medium">* Ви перебуваєте в режимі редагування. Всі зміни для всіх закладок зберігаються одночасно.</p>
                       <div className="flex gap-3">
                         <button type="button" onClick={() => setEditingCard(false)} className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition">Скасувати</button>
                         <button type="submit" disabled={savingCard} className="bg-warm-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-warm-700 transition shadow-lg disabled:opacity-50">
                           <Save size={18} /> {savingCard ? 'Збереження...' : 'ЗБЕРЕГТИ ВСЕ'}
                         </button>
                       </div>
                    </div>
                  </form>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-y-auto custom-scrollbar">
                    {activeSubTab === 'general' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                 <User size={150} />
                               </div>
                               <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Персональний профіль</h3>
                               <div className="space-y-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Стать</span>
                                    <span className="text-lg font-black text-gray-800">{data.child?.gender || '—'}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Адреса проживання</span>
                                    <span className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                      <MapPin size={18} className="text-warm-500" /> {data.child?.address || 'Не вказано'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Свідоцтво про народження</span>
                                    <span className="text-lg font-black text-gray-800">{data.child?.documentInfo || '—'}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Дата зарахування</span>
                                    <span className="text-lg font-black text-gray-800">{data.child?.enrollmentDate ? new Date(data.child.enrollmentDate).toLocaleDateString('uk-UA') : '—'}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Пільги</span>
                                    <span className="text-lg font-black text-gray-800">{data.child?.hasBenefits ? 'Наявні' : 'Відсутні'}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Опис пільг</span>
                                    <span className="text-base font-bold text-gray-700">{data.child?.benefitDescription || 'Не вказано'}</span>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="bg-warm-50 p-6 rounded-3xl border border-warm-100">
                               <h4 className="text-xs font-bold text-warm-600 uppercase mb-3 flex items-center gap-2">
                                 <FileText size={16} /> Адміністративні нотатки
                               </h4>
                               <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
                                 {data.child?.notes || 'Немає додаткових записів'}
                               </p>
                            </div>
                         </div>
                         
                         <div className="flex flex-col justify-center items-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 p-10 text-center">
                            <div className="h-40 w-40 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4 border-4 border-white shadow-inner">
                              {data.child?.photoPath ? (
                                <img
                                  src={data.child.photoPath}
                                  alt={`Фото ${data.child.fullName}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User size={80} />
                              )}
                            </div>
                            <h4 className="font-bold text-gray-400">{data.child?.photoPath ? 'Фото дитини' : 'Фото профілю'}</h4>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">
                              {data.child?.photoPath ? 'Фото включається у друк особової справи' : 'Фото ще не завантажене'}
                            </p>
                            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-warm-600 transition hover:border-warm-600">
                              <Camera size={16} />
                              {uploadingPhoto ? 'Завантаження...' : 'Додати фото'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </label>
                            <button onClick={() => setEditingCard(true)} className="mt-8 bg-white border border-gray-200 text-warm-600 px-6 py-2.5 rounded-xl font-black text-sm hover:border-warm-600 transition shadow-sm">
                              РЕДАГУВАТИ ПРОФІЛЬ
                            </button>
                         </div>
                      </div>
                    )}

                    {activeSubTab === 'family' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
                            <div className="bg-emerald-600 h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200">
                               <User size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-emerald-900 leading-tight">МАТИ</h3>
                            <div className="mt-6 space-y-6">
                               <div className="flex flex-col">
                                 <span className="text-xs font-bold text-emerald-600/60 uppercase">ПІБ</span>
                                 <span className="text-xl font-bold text-emerald-900">{data.child?.motherName || '—'}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs font-bold text-emerald-600/60 uppercase">Контактний телефон</span>
                                 <span className="text-2xl font-black text-emerald-800 flex items-center gap-2">
                                   <Phone size={20} /> {data.child?.motherPhone || '—'}
                                 </span>
                               </div>
                            </div>
                         </div>

                         <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 shadow-sm">
                            <div className="bg-blue-600 h-12 w-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200">
                               <User size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-blue-900 leading-tight">БАТЬКО</h3>
                            <div className="mt-6 space-y-6">
                               <div className="flex flex-col">
                                 <span className="text-xs font-bold text-blue-600/60 uppercase">ПІБ</span>
                                 <span className="text-xl font-bold text-blue-900">{data.child?.fatherName || '—'}</span>
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-xs font-bold text-blue-600/60 uppercase">Контактний телефон</span>
                                 <span className="text-2xl font-black text-blue-800 flex items-center gap-2">
                                   <Phone size={20} /> {data.child?.fatherPhone || '—'}
                                 </span>
                               </div>
                            </div>
                         </div>

                         <div className="md:col-span-2 flex justify-center mt-4">
                            <button onClick={() => setEditingCard(true)} className="bg-gray-800 text-white px-10 py-3 rounded-2xl font-black text-sm hover:bg-gray-900 transition shadow-xl">
                              РЕДАГУВАТИ ДАНІ РОДИНИ
                            </button>
                         </div>
                      </div>
                    )}

                    {activeSubTab === 'medical' && (
                      <div className="space-y-10">
                        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">Медична карта (026/о)</h3>
                            <button onClick={startEditing} className="text-xs font-black text-emerald-600 hover:underline">РЕДАГУВАТИ</button>
                          </div>
                          {data.card ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                               <div className="space-y-4">
                                  <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Група крові</span>
                                    <div className="text-2xl font-black text-gray-800">{data.card.bloodGroup || '—'} <span className="text-emerald-600 font-black">{data.card.rhFactor}</span></div>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Антропометрія</span>
                                    <div className="text-sm font-bold text-gray-700 mt-1">{formatMeasurementValue(data.card.height, 'см')} / {formatMeasurementValue(data.card.weight, 'кг')}</div>
                                  </div>
                               </div>
                               <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Алергії</span>
                                    <div className="text-sm font-black text-red-600 mt-1 leading-tight">{data.card.allergies || 'Не вказано'}</div>
                                  </div>
                                  <div className="p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Група здоров'я</span>
                                    <div className="text-sm font-black text-gray-800 mt-1 uppercase italic">{data.card.healthGroup || '—'} група</div>
                                  </div>
                                  <div className="md:col-span-2 p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Хронічні захворювання</span>
                                    <div className="text-sm font-bold text-gray-600 mt-1 leading-relaxed">{data.card.chronicConditions || 'Відсутні'}</div>
                                  </div>
                                  <div className="md:col-span-2 p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Особливості дієти</span>
                                    <div className="text-sm font-bold text-gray-600 mt-1 leading-relaxed">{data.card.dietaryRestrictions || 'Не вказано'}</div>
                                  </div>
                               </div>
                            </div>
                          ) : (
                            <p className="text-center py-10 text-gray-400 italic">Картка ще не створена</p>
                          )}
                        </section>

                        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">Історія антропометрії</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Можна додавати вручну або при зміні зросту/ваги</span>
                          </div>
                          <form onSubmit={handleAddMeasurement} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-4">
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase text-gray-500">Дата та час</label>
                              <input
                                type="datetime-local"
                                value={measurementForm.measuredAt}
                                onChange={(e) => setMeasurementForm({ ...measurementForm, measuredAt: e.target.value })}
                                className="ui-input w-full"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase text-gray-500">Зріст (см)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={measurementForm.height}
                                onChange={(e) => setMeasurementForm({ ...measurementForm, height: e.target.value })}
                                className="ui-input w-full"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[10px] font-bold uppercase text-gray-500">Вага (кг)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={measurementForm.weight}
                                onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
                                className="ui-input w-full"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="submit"
                                disabled={addingMeasurement}
                                className="w-full rounded-xl bg-warm-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-warm-700 disabled:opacity-50"
                              >
                                {addingMeasurement ? 'Додавання...' : 'Додати запис'}
                              </button>
                            </div>
                            <div className="md:col-span-4">
                              <label className="mb-1.5 block text-[10px] font-bold uppercase text-gray-500">Примітка</label>
                              <input
                                value={measurementForm.notes}
                                onChange={(e) => setMeasurementForm({ ...measurementForm, notes: e.target.value })}
                                className="ui-input w-full"
                                placeholder="Наприклад: плановий огляд медсестри"
                              />
                            </div>
                          </form>
                          {data.measurements && data.measurements.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                  <tr className="text-[10px] font-black text-gray-400 uppercase">
                                    <th className="px-4 py-3">Дата</th>
                                    <th className="px-4 py-3">Зріст</th>
                                    <th className="px-4 py-3">Вага</th>
                                    <th className="px-4 py-3">Примітка</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {data.measurements.slice(0, 8).map((measurement) => (
                                    <tr key={measurement.id}>
                                      <td className="px-4 py-3 text-sm font-bold text-gray-700">{formatDate(measurement.measuredAt)}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{formatMeasurementValue(measurement.height, 'см')}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{formatMeasurementValue(measurement.weight, 'кг')}</td>
                                      <td className="px-4 py-3 text-sm text-gray-500">{measurement.notes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center py-10 text-xs text-gray-400 italic">Історії вимірювань поки немає</p>
                          )}
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
                              <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Журнал щеплень</h3>
                              <div className="flex-1 overflow-hidden rounded-2xl border border-gray-50">
                                <table className="w-full text-left">
                                  <thead className="bg-gray-50">
                                    <tr className="text-[9px] font-black text-gray-400 uppercase">
                                      <th className="p-4">Вакцина</th>
                                      <th className="p-4">Статус</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {data.vaccinations?.slice(0, 5).map((vac: any) => (
                                      <tr key={vac.id}>
                                        <td className="p-4 text-xs font-bold text-gray-700">{vac.vaccineName}</td>
                                        <td className="p-4">
                                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${getVaccinationStatusBadge(vac.status)}`}>
                                             {getVaccinationStatusLabel(vac.status)}
                                           </span>
                                        </td>
                                      </tr>
                                    ))}
                                    {(!data.vaccinations || data.vaccinations.length === 0) && <tr><td colSpan={2} className="p-8 text-center text-xs text-gray-400">Немає записів</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                           </section>

                           <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
                              <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Останні хвороби</h3>
                              <div className="space-y-3">
                                {data.illnesses?.slice(0, 3).map((ill: any) => (
                                  <div key={ill.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                    <div>
                                      <div className="text-xs font-black text-gray-800">{ill.diagnosis}</div>
                                      <div className="text-[10px] text-gray-400 font-bold">{formatDate(ill.startDate)}</div>
                                    </div>
                                    <div className="text-[10px] font-black text-emerald-600 bg-white px-2 py-1 rounded-lg border border-gray-100">ОДУЖАВ</div>
                                  </div>
                                ))}
                                {(!data.illnesses || data.illnesses.length === 0) && <p className="text-center py-10 text-xs text-gray-400 italic">Світла історія без хвороб</p>}
                              </div>
                           </section>
                        </div>
                      </div>
                    )}

                    {activeSubTab === 'psychology' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Профіль розвитку</h3>
                            {data.psychCard ? (
                              <div className="space-y-6">
                                 <div className="grid grid-cols-2 gap-4">
                                   <div className="p-4 bg-warm-50 rounded-2xl border border-warm-100">
                                      <span className="text-[10px] font-bold text-warm-600 uppercase">Темперамент</span>
                                      <div className="text-lg font-black text-gray-800 mt-1">{data.psychCard.temperament || '—'}</div>
                                   </div>
                                   <div className="p-4 bg-warm-50 rounded-2xl border border-warm-100">
                                      <span className="text-[10px] font-bold text-warm-600 uppercase">Адаптація</span>
                                      <div className="text-lg font-black text-gray-800 mt-1">{data.psychCard.adaptationLevel || '—'}</div>
                                   </div>
                                 </div>
                                 <div className="p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Розвиток мовлення</span>
                                    <div className="text-sm font-bold text-gray-600 mt-1">{data.psychCard.speechDevelopment || 'Немає записів'}</div>
                                 </div>
                                 <div className="p-4 border border-gray-100 rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Внутрішні нотатки фахівця</span>
                                    <div className="text-sm font-bold text-gray-400 italic mt-1 leading-relaxed">
                                      {data.psychCard.notes || 'Психолог не залишив коментарів'}
                                    </div>
                                 </div>
                              </div>
                            ) : (
                              <div className="text-center py-20">
                                 <Brain size={48} className="mx-auto text-gray-100 mb-4" />
                                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Картку не заповнено психологом</p>
                              </div>
                            )}
                         </section>

                         <section className="bg-red-50/50 p-8 rounded-[2rem] border border-red-100 shadow-sm flex flex-col">
                            <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] mb-4">Рекомендації для батьків</h3>
                            <div className="flex-1 bg-white p-6 rounded-2xl border-2 border-dashed border-red-200">
                               {data.psychCard?.recommendations ? (
                                 <p className="text-red-700 font-black text-lg leading-relaxed whitespace-pre-wrap animate-pulse-subtle">
                                   {data.psychCard.recommendations}
                                 </p>
                               ) : (
                                 <div className="h-full flex flex-col items-center justify-center text-red-200 text-center">
                                    <Info size={40} className="mb-4 opacity-30" />
                                    <p className="text-sm font-bold uppercase tracking-tighter">Наразі спеціальних рекомендацій немає</p>
                                 </div>
                               )}
                            </div>
                            <p className="mt-4 text-[9px] text-red-400 font-bold uppercase text-center italic">
                              * Ці нотатки будуть першими, що побачать батьки у своєму додатку
                            </p>
                         </section>
                      </div>
                    )}

                    {activeSubTab === 'qr' && (
                      <div className="flex flex-col items-center justify-center py-10">
                        <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-xl mb-8 flex flex-col items-center">
                          <ChildQRCode 
                            childId={child.id}
                            qrToken={data?.qrToken || child.qrToken}
                            childName={child.fullName}
                            onRegenerate={fetchCard}
                          />
                        </div>
                        <div className="max-w-md text-center">
                           <h4 className="font-black text-gray-800 text-xl mb-4">Унікальний ключ доступу</h4>
                           <p className="text-sm text-gray-500 leading-relaxed font-bold">
                             Цей код використовується батьками для активації мобільного кабінету своєї дитини.
                             Код залишається незмінним протягом всього періоду перебування дитини у садку.
                           </p>
                           <div className="mt-8 flex gap-3 justify-center">
                              <span className="bg-warm-50 text-warm-700 px-4 py-2 rounded-full text-xs font-black border border-warm-100 uppercase tracking-widest">Доступ: Активно</span>
                              <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black border border-blue-100 uppercase tracking-widest text-[8px] flex items-center">Дійсний до випуску</span>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {data && (
        <div className="hidden print:block bg-white text-black p-8 text-[12px] leading-5">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Особова справа дитини</h1>
            <p className="mt-2 text-sm">{data.child?.fullName || child.fullName}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              {data.child?.photoPath && (
                <div className="mb-4">
                  <img
                    src={data.child.photoPath}
                    alt={`Фото ${data.child.fullName}`}
                    className="h-32 w-32 rounded-lg border object-cover"
                  />
                </div>
              )}
              <h2 className="font-bold border-b pb-1 mb-2">Основні дані</h2>
              <p><strong>ПІБ:</strong> {data.child?.fullName || '—'}</p>
              <p><strong>Дата народження:</strong> {formatDate(data.child?.birthDate || child.birthDate)}</p>
              <p><strong>Група:</strong> {child.groupName || '—'}</p>
              <p><strong>Стать:</strong> {data.child?.gender || '—'}</p>
              <p><strong>Адреса:</strong> {data.child?.address || '—'}</p>
              <p><strong>Свідоцтво:</strong> {data.child?.documentInfo || '—'}</p>
              <p><strong>Дата зарахування:</strong> {formatDate(data.child?.enrollmentDate || null)}</p>
              <p><strong>Наявність пільг:</strong> {data.child?.hasBenefits ? 'Так' : 'Ні'}</p>
              <p><strong>Опис пільг:</strong> {data.child?.benefitDescription || '—'}</p>
            </div>
            <div>
              <h2 className="font-bold border-b pb-1 mb-2">Родина</h2>
              <p><strong>Мати:</strong> {data.child?.motherName || '—'}</p>
              <p><strong>Телефон матері:</strong> {data.child?.motherPhone || '—'}</p>
              <p><strong>Батько:</strong> {data.child?.fatherName || '—'}</p>
              <p><strong>Телефон батька:</strong> {data.child?.fatherPhone || '—'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-bold border-b pb-1 mb-2">Медичні дані</h2>
            <p><strong>Група крові:</strong> {data.card?.bloodGroup || '—'} {data.card?.rhFactor || ''}</p>
            <p><strong>Група здоров'я:</strong> {data.card?.healthGroup || '—'}</p>
            <p><strong>Фізкультурна група:</strong> {data.card?.physicalGroup || '—'}</p>
            <p><strong>Алергії:</strong> {data.card?.allergies || 'Не вказано'}</p>
            <p><strong>Хронічні захворювання:</strong> {data.card?.chronicConditions || 'Не вказано'}</p>
            <p><strong>Дієтичні особливості:</strong> {data.card?.dietaryRestrictions || 'Не вказано'}</p>
            <p><strong>Поточна антропометрія:</strong> {formatMeasurementValue(data.card?.height, 'см')} / {formatMeasurementValue(data.card?.weight, 'кг')}</p>
          </div>

          <div className="mb-6">
            <h2 className="font-bold border-b pb-1 mb-2">Історія антропометрії</h2>
            {data.measurements?.length ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-left">Дата</th>
                    <th className="border px-2 py-1 text-left">Зріст</th>
                    <th className="border px-2 py-1 text-left">Вага</th>
                    <th className="border px-2 py-1 text-left">Примітка</th>
                  </tr>
                </thead>
                <tbody>
                  {data.measurements.map((measurement) => (
                    <tr key={measurement.id}>
                      <td className="border px-2 py-1">{formatDate(measurement.measuredAt)}</td>
                      <td className="border px-2 py-1">{formatMeasurementValue(measurement.height, 'см')}</td>
                      <td className="border px-2 py-1">{formatMeasurementValue(measurement.weight, 'кг')}</td>
                      <td className="border px-2 py-1">{measurement.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Історія вимірювань відсутня.</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="font-bold border-b pb-1 mb-2">Щеплення</h2>
            {data.vaccinations?.length ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-left">Вакцина</th>
                    <th className="border px-2 py-1 text-left">Статус</th>
                    <th className="border px-2 py-1 text-left">План</th>
                    <th className="border px-2 py-1 text-left">Факт</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vaccinations.map((vac) => (
                    <tr key={vac.id}>
                      <td className="border px-2 py-1">{vac.vaccineName}</td>
                      <td className="border px-2 py-1">{getVaccinationStatusLabel(vac.status)}</td>
                      <td className="border px-2 py-1">{formatDate(vac.planDate)}</td>
                      <td className="border px-2 py-1">{formatDate(vac.dateGiven)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Записів про щеплення немає.</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="font-bold border-b pb-1 mb-2">Хвороби</h2>
            {data.illnesses?.length ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-left">Діагноз</th>
                    <th className="border px-2 py-1 text-left">Початок</th>
                    <th className="border px-2 py-1 text-left">Завершення</th>
                    <th className="border px-2 py-1 text-left">Примітки</th>
                  </tr>
                </thead>
                <tbody>
                  {data.illnesses.map((ill) => (
                    <tr key={ill.id}>
                      <td className="border px-2 py-1">{ill.diagnosis}</td>
                      <td className="border px-2 py-1">{formatDate(ill.startDate)}</td>
                      <td className="border px-2 py-1">{formatDate(ill.endDate)}</td>
                      <td className="border px-2 py-1">{ill.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Історія хвороб відсутня.</p>
            )}
          </div>

          <div>
            <h2 className="font-bold border-b pb-1 mb-2">Додаткові нотатки</h2>
            <p>{data.child?.notes || '—'}</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
export default MedicalCardModal;
