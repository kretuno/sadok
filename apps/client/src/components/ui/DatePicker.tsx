import React, { useState, useRef, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, parseISO 
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => (value ? parseISO(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-warm-100 hover:border-warm-200 shadow-sm transition-all text-sm font-bold text-gray-700"
      >
        <CalendarIcon size={16} className="text-warm-500" />
        {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: uk }) : 'Оберіть дату'}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-[110] bg-white rounded-[2rem] border border-warm-100 shadow-2xl p-4 w-72 animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-warm-50 rounded-xl transition"><ChevronLeft size={18} /></button>
            <div className="text-sm font-black text-gray-800 uppercase tracking-tighter">
              {format(currentMonth, 'LLLL yyyy', { locale: uk })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-warm-50 rounded-xl transition"><ChevronRight size={18} /></button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
              <div key={d} className="text-[10px] font-black text-gray-400 text-center py-2 uppercase">{d}</div>
            ))}
            {days.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setIsOpen(false);
                  }}
                  className={cn(
                    "h-9 w-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center",
                    !isCurrentMonth && "text-gray-200",
                    isCurrentMonth && !isSelected && "text-gray-700 hover:bg-warm-50 hover:text-warm-600",
                    isSelected && "bg-warm-500 text-white shadow-lg shadow-warm-100"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-warm-50">
            <button 
              onClick={() => {
                onChange(format(new Date(), 'yyyy-MM-dd'));
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase text-warm-500 hover:text-warm-600 tracking-widest w-full text-center"
            >
              Сьогодні
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
