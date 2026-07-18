'use client';

import { useEffect, useState } from 'react';

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; database: string; timestamp: string }
  | { status: 'error'; message: string };

export function ApiHealthStatus() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth({ status: 'ok', database: data.database, timestamp: data.timestamp }))
      .catch((err) => setHealth({ status: 'error', message: err.message }));
  }, []);

  const dotColor =
    health.status === 'ok' ? 'bg-primary' : health.status === 'error' ? 'bg-destructive' : 'bg-muted-foreground';

  return (
    <div className="flex items-center gap-sm rounded-md border border-border bg-muted px-md py-sm text-sm text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {health.status === 'loading' && 'Checking API connection…'}
      {health.status === 'ok' && `API connected — database: ${health.database}`}
      {health.status === 'error' && `API unreachable: ${health.message}`}
    </div>
  );
}
