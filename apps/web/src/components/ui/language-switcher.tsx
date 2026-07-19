'use client';

import { Languages } from 'lucide-react';
import { useLocaleStore } from '@/stores/locale-store';

export function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
