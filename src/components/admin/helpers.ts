import { PublicEmployee } from '@/lib/types';

export type EmployeeSpecialty = 'lubrication' | 'electrical' | 'mechanics';

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function classifyEmployeeSpecialty(employee: PublicEmployee): EmployeeSpecialty {
  const normalized = `${employee.department} ${employee.role}`.toLowerCase();

  if (normalized.includes('lubr')) return 'lubrication';
  if (normalized.includes('eletr') || normalized.includes('elétr')) return 'electrical';
  return 'mechanics';
}
