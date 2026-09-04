import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { en } from './en';
import { hi } from './hi';
import { AuthService } from '../services/auth';
import { getUserWedding } from '../services/wedding';
import { SettingsService } from '../services/settings';

export type Language = 'en' | 'hi';
export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<string, string>> = { en, hi };

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const db = useSQLiteContext();
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const session = await AuthService.getCurrentSession(db);
        if (session) {
          const wedding = await getUserWedding(db, session.id);
          if (wedding) {
            const savedLang = await SettingsService.getPreference(db, wedding.id, 'language');
            if (savedLang === 'hi' || savedLang === 'en') {
              setLanguageState(savedLang as Language);
            }
          }
        }
      } catch (e) {
        // Default to English
      }
    };
    loadLanguage();
  }, [db]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      const session = await AuthService.getCurrentSession(db);
      if (session) {
        const wedding = await getUserWedding(db, session.id);
        if (wedding) {
          await SettingsService.setPreference(db, wedding.id, 'language', lang);
        }
      }
    } catch (e) {
      // Ignore save error
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
