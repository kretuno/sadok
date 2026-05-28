import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SelectOption {
  id: string | number;
  name: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Оберіть варіант',
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-2.5 text-sm transition-all duration-300 outline-none shadow-sm',
          isOpen 
            ? 'border-warm-500 ring-4 ring-warm-100 ring-opacity-50 shadow-inner' 
            : 'border-warm-100 hover:border-warm-200 hover:bg-warm-50 hover:bg-opacity-50',
          disabled && 'opacity-60 cursor-not-allowed grayscale-[0.2]',
          !selectedOption && 'text-gray-400'
        )}
      >
        <span className="truncate font-medium">{selectedOption ? selectedOption.name : placeholder}</span>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-warm-500 text-white rotate-180" : "bg-warm-50 text-warm-500"
        )}>
          <ChevronDown size={14} strokeWidth={3} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-[100] mt-2 w-full origin-top-right overflow-hidden rounded-2xl border border-warm-100 bg-white/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-warm-200 scrollbar-track-transparent">
            {options.length > 0 ? (
              options.map((option) => {
                const isSelected = String(option.id) === String(value);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 group',
                      isSelected
                        ? 'bg-gradient-to-r from-warm-500 to-warm-400 text-white font-bold shadow-md'
                        : 'text-gray-700 hover:bg-warm-50 hover:pl-4'
                    )}
                  >
                    <span className="truncate whitespace-normal leading-tight">{option.name}</span>
                    {isSelected ? (
                       <Check size={16} className="shrink-0" />
                    ) : (
                       <div className="w-1.5 h-1.5 rounded-full bg-warm-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">🌻</div>
                <span className="font-semibold italic">Нічого не знайдено</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
