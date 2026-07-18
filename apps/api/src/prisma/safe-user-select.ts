/** Fields safe to return from `User` in API responses — never passwordHash. */
export const SAFE_USER_FIELDS = {
  id: true,
  email: true,
  civilId: true,
  phone: true,
  status: true,
  locale: true,
  lastLoginAt: true,
  createdAt: true,
} as const;
