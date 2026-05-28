import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Palette, Sun, Waves, Zap } from 'lucide-react';

const ThemeSettingsTab: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'sunflower',
      name: 'Соняшник',
      desc: 'Тепла, затишна тема (за замовчуванням)',
      icon: <Sun size={24} className="text-[#f59e0b]" />,
      color: 'bg-[#f59e0b]',
    },
    {
      id: 'blue',
      name: 'Синій океан',
      desc: 'Класична ділова тема',
      icon: <Waves size={24} className="text-[#3b82f6]" />,
      color: 'bg-[#3b82f6]',
    },
    {
      id: 'black',
      name: 'Суворий чорний',
      desc: 'Мінімалістичний монохромний стиль',
      icon: <Zap size={24} className="text-[#18181b]" />,
      color: 'bg-[#18181b]',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-warm-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="text-warm-500" />
          <h3 className="text-xl font-semibold text-gray-800">Кольорова тема</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {themes.map((item) => {
            const isActive = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as any)}
                className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${
                  isActive
                    ? 'border-warm-500 bg-warm-50 shadow-md scale-[1.02]'
                    : 'border-warm-100 hover:border-warm-200 hover:bg-warm-50'
                }`}
              >
                <div className="mb-4 p-3 bg-white rounded-xl shadow-sm">
                  {item.icon}
                </div>
                <div className="font-bold text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {item.desc}
                </div>
                <div className={`mt-4 w-full h-1.5 rounded-full ${item.color}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 text-sm">
        Обрана тема зберігається локально у вашому браузері та буде застосована під час наступного запуску.
      </div>
    </div>
  );
};

export default ThemeSettingsTab;
