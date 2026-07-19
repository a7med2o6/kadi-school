'use client';

import { dictionaries } from './index';
import { useLocaleStore } from '@/stores/locale-store';

/** const t = useTranslations(); <p>{t.nav.dashboard}</p> — fully typed against the Dictionary shape. */
export function useTranslations() {
  const locale = useLocaleStore((s) => s.locale);
  return dictionaries[locale];
}
