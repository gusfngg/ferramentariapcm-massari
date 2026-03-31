import { Employee, PublicEmployee } from '@/lib/types';

export const SUPREME_ADMIN_ID = 'emp-admin-001';
export const SUPREME_ADMIN_BADGE = '000';

export function normalizeBadge(value: string) {
  return value.trim();
}

export function isSupremeAdmin(employee: Pick<Employee, 'id' | 'badge'> | Pick<PublicEmployee, 'id' | 'badge'>) {
  return employee.id === SUPREME_ADMIN_ID || normalizeBadge(employee.badge) === SUPREME_ADMIN_BADGE;
}

export function matchesBadge(employeeBadge: string, input: string) {
  const normalizedInput = normalizeBadge(input);
  if (!normalizedInput) return false;

  return normalizeBadge(employeeBadge) === normalizedInput;
}

export function isValidBadge(value: string) {
  return /^\d+$/.test(normalizeBadge(value));
}

export function isValidPin(value: string) {
  return /^\d{6}$/.test(value);
}

export function sanitizeEmployee(employee: Employee): PublicEmployee {
  const { password, ...publicEmployee } = employee;
  return publicEmployee;
}
