import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
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
  optionsClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  actionOption?: {
    label: string;
    onSelect: () => void;
  };
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Оберіть варіант',
  className,
  optionsClassName,
  disabled = false,
  searchable,
  actionOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable !== undefined ? searchable : options.length > 7;
  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Враховуємо очікувану висоту випадаючого списку (~280px)
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }

      if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, showSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = searchQuery.trim()
    ? options.filter((option) =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : options;

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
          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ml-2",
          isOpen ? "bg-warm-500 text-white rotate-180" : "bg-warm-50 text-warm-500"
        )}>
          <ChevronDown size={14} strokeWidth={3} />
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-[100] w-full overflow-hidden rounded-2xl border border-warm-100 bg-white/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200',
            openUpward ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
          )}
        >
          {showSearch && (
            <div className="relative mb-1.5 p-1 border-b border-warm-100">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Швидкий пошук..."
                className="w-full rounded-xl bg-warm-50/70 pl-8 pr-7 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-warm-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className={cn('max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-warm-200 scrollbar-track-transparent', optionsClassName)}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
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
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 group my-0.5',
                      isSelected
                        ? 'bg-gradient-to-r from-warm-500 to-warm-400 text-white font-bold shadow-md'
                        : 'text-gray-700 hover:bg-warm-50 hover:pl-4'
                    )}
                  >
                    <span className="truncate whitespace-normal leading-tight">{option.name}</span>
                    {isSelected ? (
                       <Check size={16} className="shrink-0 ml-1" />
                    ) : (
                       <div className="w-1.5 h-1.5 rounded-full bg-warm-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm">🔍</div>
                <span className="font-semibold italic">Нічого не знайдено</span>
              </div>
            )}
            {actionOption && (
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-1 mt-1 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    actionOption.onSelect();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-warm-700 bg-warm-50 hover:bg-warm-100 border border-warm-200/80 transition"
                >
                  <span className="truncate font-bold">{actionOption.label}</span>
                  <span className="shrink-0 font-black text-warm-600 ml-1 text-sm">+</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
