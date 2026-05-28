import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeType = 'sunflower' | 'blue' | 'black';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeType) || 'sunflower';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Прибираємо всі класи тем перед застосуванням нової.
    root.classList.remove('theme-blue', 'theme-black');
    
    // `sunflower` є базовою темою в `:root`, інші додаємо як окремі класи.
    if (theme === 'blue') root.classList.add('theme-blue');
    if (theme === 'black') root.classList.add('theme-black');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
