'use client';

import { useLocaleStore } from '@/stores/locale-store';

function UkFlag() {
  return (
    <svg viewBox="0 0 60 40" className="h-3.5 w-5 shrink-0 rounded-sm" aria-hidden="true">
      <defs>
        <clipPath id="uk-clip">
          <rect width="60" height="40" rx="2" />
        </clipPath>
      </defs>
      <g clipPath="url(#uk-clip)">
        <rect width="60" height="40" fill="#00247d" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#cf142b" strokeWidth="3.5" />
        <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="14" />
        <path d="M30,0 V40 M0,20 H60" stroke="#cf142b" strokeWidth="8" />
      </g>
    </svg>
  );
}

function KuwaitFlag() {
  return (
    <svg viewBox="0 0 60 40" className="h-3.5 w-5 shrink-0 rounded-sm" aria-hidden="true">
      <defs>
        <clipPath id="kw-clip">
          <rect width="60" height="40" rx="2" />
        </clipPath>
      </defs>
      <g clipPath="url(#kw-clip)">
        <rect width="60" height="40" fill="#fff" />
        <rect width="60" height="13.3" fill="#007a3d" />
        <rect y="26.7" width="60" height="13.3" fill="#ce1126" />
        <path d="M0,0 L18,0 L8,20 L18,40 L0,40 Z" fill="#1a1a1a" />
      </g>
    </svg>
  );
}

export function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const isEnglish = locale === 'en';

  return (
    <button
      type="button"
      onClick={() => setLocale(isEnglish ? 'ar' : 'en')}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Switch language"
    >
      {isEnglish ? <KuwaitFlag /> : <UkFlag />}
      {isEnglish ? 'العربية' : 'English'}
    </button>
  );
}
