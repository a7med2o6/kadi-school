'use client';

import { useState } from 'react';
import { Moon, Sun, MoveHorizontal } from 'lucide-react';

export function PreviewControls() {
  const [isDark, setIsDark] = useState(false);
  const [isRtl, setIsRtl] = useState(false);

  function toggleDark() {
    document.documentElement.classList.toggle('dark');
    setIsDark((v) => !v);
  }

  function toggleDir() {
    const next = document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl';
    document.documentElement.dir = next;
    setIsRtl(next === 'rtl');
  }

  return (
    <div className="flex gap-sm">
      <button
        type="button"
        onClick={toggleDark}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-md py-sm text-sm font-medium text-foreground shadow-ambient transition-colors hover:bg-accent cursor-pointer"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {isDark ? 'Light' : 'Dark'}
      </button>
      <button
        type="button"
        onClick={toggleDir}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-md py-sm text-sm font-medium text-foreground shadow-ambient transition-colors hover:bg-accent cursor-pointer"
      >
        <MoveHorizontal className="h-4 w-4" />
        {isRtl ? 'LTR' : 'RTL'}
      </button>
    </div>
  );
}
