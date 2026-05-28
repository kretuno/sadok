import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Save, Users, Filter } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import CustomSelect from '../../components/ui/CustomSelect';
import DatePicker from '../../components/ui/DatePicker';

interface AttendanceRecord {
  childId: number;
  fullName: string;
  isPresent: boolean | null;
}

interface Group {
  id: number;
  name: string;
}

const AttendancePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadGroups();
  }, []);

  useEffect(() => {
    if (selectedDate) void loadAttendance();
  }, [selectedDate, selectedGroupId]);

  const loadGroups = async () => {
    const res = await api.get('/children/groups');
    setGroups(res.data);
    if (res.data.length > 0) setSelectedGroupId(String(res.data[0].id));
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?date=${selectedDate}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}`);
      setRecords(res.data.map((r: any) => ({
        childId: r.childId,
        fullName: r.fullName,
        isPresent: r.isPresent === null ? true : r.isPresent // За замовчуванням всі присутні
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (childId: number) => {
    setRecords(prev => prev.map(r => 
      r.childId === childId ? { ...r, isPresent: !r.isPresent } : r
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    try {
      await api.post('/attendance', {
        date: selectedDate,
        records: records.map(r => ({ childId: r.childId, isPresent: r.isPresent }))
      });
      setSuccess('Відвідуваність збережена!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-warm-500 font-bold">Облік присутності</p>
          <h2 className="text-3xl font-bold text-gray-800">Журнал відвідуваності</h2>
          <p className="text-gray-500 mt-2">Відмічайте присутніх дітей для автоматичного розрахунку харчування.</p>
        </div>
        <div className="flex gap-3 bg-white p-2 rounded-2xl border border-warm-100 shadow-sm">
           <div className="flex items-center gap-2 border-r border-warm-100 pr-2">
             <DatePicker 
               value={selectedDate}
               onChange={(val) => setSelectedDate(val)}
               className="border-none shadow-none"
             />
           </div>
           <div className="w-48">
             <CustomSelect 
               options={groups.map(g => ({ id: g.id, name: g.name }))}
               value={selectedGroupId}
               onChange={val => setSelectedGroupId(String(val))}
               className="border-none shadow-none"
             />
           </div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-warm-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-warm-100 flex items-center justify-between bg-warm-50/30">
          <div className="flex items-center gap-4">
             <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Список групи</div>
             <div className="px-3 py-1 bg-white rounded-full border border-warm-100 text-xs font-black text-warm-600">
               {records.length} ДІТЕЙ
             </div>
          </div>
          <button 
            disabled={saving || records.length === 0}
            onClick={handleSave}
            className="ui-button-primary px-8"
          >
            <Save size={18} /> {saving ? 'Збереження...' : 'Зберегти журнал'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {records.map(record => (
            <button
              key={record.childId}
              onClick={() => toggleAttendance(record.childId)}
              className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${
                record.isPresent 
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                : 'border-warm-100 bg-white grayscale opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${record.isPresent ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                   <Users size={20} />
                </div>
                <div className="text-left">
                  <div className={`font-bold ${record.isPresent ? 'text-gray-800' : 'text-gray-400'}`}>
                    {record.fullName.split(' ')[0]}
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-tighter opacity-50">
                    {record.fullName.split(' ').slice(1).join(' ')}
                  </div>
                </div>
              </div>
              {record.isPresent ? (
                <CheckCircle className="text-emerald-500" size={24} />
              ) : (
                <XCircle className="text-gray-300" size={24} />
              )}
            </button>
          ))}

          {records.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center space-y-4">
               <div className="bg-warm-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-warm-300">
                 <Filter size={32} />
               </div>
               <p className="text-gray-400 font-medium">У цій групі ще немає вихованців.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
