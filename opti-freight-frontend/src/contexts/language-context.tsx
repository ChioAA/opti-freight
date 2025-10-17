
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    try {
        const storedLang = localStorage.getItem('language') as Language | null;
        if (storedLang) {
            setLanguageState(storedLang);
        }
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    try {
        localStorage.setItem('language', lang);
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
