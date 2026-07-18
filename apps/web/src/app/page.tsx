import { ApiHealthStatus } from '@/components/api-health-status';
import { PreviewControls } from '@/components/preview-controls';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen flex-col items-center justify-center gap-lg py-3xl">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-xl shadow-ambient">
          <div className="mb-lg flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kadi School</h1>
            <PreviewControls />
          </div>
          <p className="mb-md text-sm leading-relaxed text-muted-foreground">
            Frontend skeleton wired to the design tokens in DESIGN.md — Tailwind, shadcn/ui conventions, dark mode,
            and RTL/LTR are live on this page.
          </p>
          <ApiHealthStatus />
        </div>
      </div>
    </main>
  );
}
