import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bypasses the global JwtAuthGuard — for login/refresh/forgot-password only. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
