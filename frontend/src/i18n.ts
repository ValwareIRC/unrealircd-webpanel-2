import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enUS from './locales/en-US.json';
import enGB from './locales/en-GB.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import tr from './locales/tr.json';
import pl from './locales/pl.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import nl from './locales/nl.json';

const resources = {
  'en-US': { translation: enUS },
  'en-GB': { translation: enGB },
  'pt': { translation: pt },
  'es': { translation: es },
  'tr': { translation: tr },
  'pl': { translation: pl },
  'ja': { translation: ja },
  'zh': { translation: zh },
  'fr': { translation: fr },
  'de': { translation: de },
  'nl': { translation: nl },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US',
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;