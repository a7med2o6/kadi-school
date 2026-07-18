'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient, ApiError } from '@/lib/api-client';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';
import { useAuthStore, type SessionUser } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    try {
      const { accessToken } = await apiClient.post<{ accessToken: string; userId: string }>('/auth/login', data);
      useAuthStore.getState().setAccessToken(accessToken);
      const user = await apiClient.get<SessionUser>('/auth/me');
      setSession(accessToken, user);
      router.push('/dashboard');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-md">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-xl shadow-ambient"
      >
        <h1 className="mb-lg text-2xl font-semibold tracking-tight text-foreground">Kadi School</h1>

        <div className="mb-md">
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-foreground">
            Email or Civil ID
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            className="w-full rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            {...register('identifier')}
          />
          {errors.identifier && <p className="mt-1 text-sm text-destructive">{errors.identifier.message}</p>}
        </div>

        <div className="mb-lg">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-input bg-background px-md py-sm text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p className="mb-md rounded-md bg-destructive/10 px-md py-sm text-sm text-destructive">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
