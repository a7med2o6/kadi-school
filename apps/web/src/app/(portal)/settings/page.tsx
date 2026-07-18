import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3xl text-center shadow-ambient">
        <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Settings className="h-6 w-6" />
        </span>
        <h2 className="mb-1 font-medium text-foreground">School settings are coming soon</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Academic year defaults, branding, and locale preferences will live here in a later phase.
        </p>
      </div>
    </div>
  );
}
