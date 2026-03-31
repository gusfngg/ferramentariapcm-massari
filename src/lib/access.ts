import { EmployeeRole } from '@/lib/types';

export const ROLE_ALLOWED_ROUTES: Record<EmployeeRole, string[]> = {
  mechanic: ['/', '/devolucao'],
  admin: ['/', '/devolucao', '/historico', '/admin'],
};

export function canAccessRoute(role: EmployeeRole, pathname: string) {
  return ROLE_ALLOWED_ROUTES[role].includes(pathname);
}
