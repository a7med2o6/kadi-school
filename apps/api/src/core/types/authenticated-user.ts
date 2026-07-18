export interface AuthenticatedUser {
  id: string;
  schoolId: string;
  schoolSlug: string;
  email: string | null;
  civilId: string | null;
  roles: string[];
  permissions: string[];
}
