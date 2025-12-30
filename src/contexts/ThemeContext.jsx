// src/contexts/ThemeContext.jsx
import React, { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext({
  dark: true,
  setDark: (v) => {}
});

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      // read saved choice or default to true
      const saved = localStorage.getItem('app_theme_dark');
      if (saved !== null) return saved === '1';
    } catch (e) {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_theme_dark', dark ? '1' : '0');
    } catch (e) {}
    // add class on document element for tailwind/class based dark mode
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
