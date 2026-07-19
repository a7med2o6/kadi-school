import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bypasses the global JwtAuthGuard — for login/refresh/forgot-password and public asset routes (e.g. avatar images, which <img> tags can't attach a Bearer token to). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
