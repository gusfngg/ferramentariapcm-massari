import { queryOptions } from '@tanstack/react-query';
import { PublicEmployee, Tool, Withdrawal } from '@/lib/types';

export const queryKeys = {
  employees: ['employees'] as const,
  tools: ['tools'] as const,
  withdrawals: ['withdrawals'] as const,
};

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input);

  if (!response.ok) {
    let message = `Erro ao carregar ${input}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors and keep fallback message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const employeesQueryOptions = queryOptions({
  queryKey: queryKeys.employees,
  queryFn: () => fetchJson<PublicEmployee[]>('/api/employees'),
  staleTime: 5 * 60_000,
});

export const toolsQueryOptions = queryOptions({
  queryKey: queryKeys.tools,
  queryFn: () => fetchJson<Tool[]>('/api/tools'),
  staleTime: 60_000,
});

export const withdrawalsQueryOptions = queryOptions({
  queryKey: queryKeys.withdrawals,
  queryFn: () => fetchJson<Withdrawal[]>('/api/withdrawals'),
  staleTime: 30_000,
});
