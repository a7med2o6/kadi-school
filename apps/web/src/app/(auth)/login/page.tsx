'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, GraduationCap, Lock, Mail } from 'lucide-react';
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
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-primary px-3xl py-3xl text-primary-foreground lg:flex">
        <div className="max-w-md">
          <div className="mb-2xl flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-lg font-bold">Kadi School</span>
          </div>

          <h1 className="mb-md text-4xl font-bold leading-tight tracking-tight">
            Empowering the next generation of leaders.
          </h1>
          <p className="text-white/80">
            Manage your institution with a high-performance administrative portal designed for clarity, speed, and
            efficiency.
          </p>

          {/* Decorative browser-window graphic */}
          <div className="relative mt-3xl">
            <div className="rounded-lg border border-white/20 bg-white/10 p-md backdrop-blur-sm">
              <div className="mb-md flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="ml-auto h-2 w-24 rounded-full bg-white/30" />
              </div>
              <div className="flex gap-sm">
                <div className="h-20 flex-1 rounded-md bg-white/15" />
                <div className="h-20 flex-1 rounded-md bg-white/15" />
                <div className="h-20 flex-1 rounded-md bg-white/15" />
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 -z-10 h-full w-full rounded-lg border border-white/10" />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-card px-md py-3xl">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="mb-xl text-sm text-muted-foreground">Please enter your details to sign in to your account.</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-md">
              <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-foreground">
                Email or Civil ID
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className="w-full rounded border border-input bg-background py-sm pl-9 pr-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && <p className="mt-1 text-sm text-destructive">{errors.identifier.message}</p>}
            </div>

            <div className="mb-md">
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <span className="text-sm text-primary">Forgot password?</span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded border border-input bg-background py-sm pl-9 pr-md text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <label className="mb-lg flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="h-4 w-4 rounded border-input" />
              Remember me for 30 days
            </label>

            {serverError && (
              <p className="mb-md rounded bg-destructive/10 px-md py-sm text-sm text-destructive">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-xl text-center text-xs text-muted-foreground">
            Kadi School — School Management SaaS
          </p>
        </div>
      </div>
    </main>
  );
}
