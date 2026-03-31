import { ToolCategory, ToolCondition } from '@/lib/types';

export const CATEGORY_OPTIONS: { value: ToolCategory; label: string }[] = [
  { value: 'hand', label: 'Manual' },
  { value: 'power', label: 'Elétrica' },
  { value: 'measuring', label: 'Medição' },
  { value: 'electrical', label: 'Elétrica/Eletro' },
  { value: 'cutting', label: 'Corte' },
];

export const CONDITION_OPTIONS: { value: ToolCondition; label: string }[] = [
  { value: 'good', label: 'Bom Estado' },
  { value: 'fair', label: 'Estado Regular' },
  { value: 'maintenance', label: 'Em Manutenção' },
];

export const ROLE_LABEL: Record<string, string> = {
  mechanic: 'Mecânico',
  admin: 'Admin',
};
