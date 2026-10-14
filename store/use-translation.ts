import { create } from 'zustand';
import { getBackendApiRoot, getTenantHeaders } from '@/lib/runtime-context';
import { safeLocalStorageSetItem, safeLocalStorageGetItem } from '@/lib/safe-storage';

interface TranslationState {
  locale: string;
  dictionary: Record<string, string>;
  isReady: boolean;
  initLocale: () => Promise<void>;
  setLocale: (newLocale: string) => Promise<void>;
  t: (key: string, fallback?: string, replacements?: Record<string, any>) => string;
}

const getApiUrl = (endpoint: string) => `${getBackendApiRoot()}${endpoint}`;

/**
 * One request per locale. initLocale() is called by two providers (and twice
 * again under React dev double-effects), and each call used to download the
 * full ~230 KB dictionary — four times on every dashboard load. Concurrent
 * callers now share the in-flight request, and a locale already loaded is not
 * fetched again.
 */
const inflight: Record<string, Promise<void> | undefined> = {};

/** The dictionary for a locale, or null when it could not be loaded. */
const fetchDictionary = async (locale: string): Promise<Record<string, string> | null> => {
  try {
    const res = await fetch(getApiUrl(`/translations/${locale}`), {
      headers: {
        'Accept': 'application/json',
        ...getTenantHeaders()
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data || data || {};
  } catch (err) {
    console.error("Failed to load dictionary:", err);
    return null;
  }
};

export const useTranslation = create<TranslationState>((set, get) => ({
  locale: 'en',
  dictionary: {},
  isReady: false,

  initLocale: async () => {
    const savedLocale = typeof window !== 'undefined' ? safeLocalStorageGetItem('hive_locale') || 'en' : 'en';
    await get().setLocale(savedLocale);
  },

  setLocale: async (newLocale: string) => {
    if (typeof window !== 'undefined') {
      safeLocalStorageSetItem('hive_locale', newLocale);
    }

    const current = get();
    if (current.isReady && current.locale === newLocale && Object.keys(current.dictionary).length > 0) {
      return;
    }

    inflight[newLocale] ??= fetchDictionary(newLocale)
      .then((dictionary) => {
        set(dictionary
          ? { locale: newLocale, dictionary, isReady: true }
          : { locale: newLocale, isReady: true });
      })
      .finally(() => {
        inflight[newLocale] = undefined;
      });

    return inflight[newLocale];
  },

  t: (key: string, fallback?: string, replacements?: Record<string, any>) => {
    const { dictionary } = get();
    let text = dictionary[key];
    if (!text && key.startsWith('global.')) {
      text = dictionary[key.slice(7)];
    }
    if (!text && !key.includes('.')) {
      text = dictionary[`global.${key}`];
    }
    text = text || fallback || key;

    if (replacements) {
      // Sort keys by length descending so longer keys (e.g., 'total') are replaced before prefixes (e.g., 'to')
      Object.entries(replacements)
        .sort((a, b) => b[0].length - a[0].length)
        .forEach(([k, v]) => {
          // `{{key}}` first: replacing `{key}` inside it would leave the outer
          // braces behind ("{29} days left").
          text = text
            .replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v))
            .replace(new RegExp(`:${k}\\b`, 'g'), String(v))
            .replace(new RegExp(`:${k}`, 'g'), String(v))
            .replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
    }

    return text;
  }
}));
