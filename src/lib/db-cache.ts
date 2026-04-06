import { unstable_cache } from 'next/cache';
import { getEmployees, getTools, getWithdrawals } from '@/lib/db';

const getEmployeesCached = unstable_cache(async () => getEmployees(), ['employees:list'], {
  tags: ['employees'],
  revalidate: 15,
});

const getToolsCached = unstable_cache(async () => getTools(), ['tools:list'], {
  tags: ['tools'],
  revalidate: 10,
});

const getWithdrawalsCached = unstable_cache(async () => getWithdrawals(), ['withdrawals:list'], {
  tags: ['withdrawals'],
  revalidate: 5,
});

export async function readCachedEmployees() {
  return getEmployeesCached();
}

export async function readCachedTools() {
  return getToolsCached();
}

export async function readCachedWithdrawals() {
  return getWithdrawalsCached();
}
