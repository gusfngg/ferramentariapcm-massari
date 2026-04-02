'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { canAccessRoute } from '@/lib/access';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!employee && pathname !== '/') {
      router.replace('/');
      return;
    }
    if (employee && pathname !== '/' && !canAccessRoute(employee.role, pathname)) {
      router.replace('/');
    }
  }, [employee, isReady, pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md rounded-2xl border border-brand-gray-border bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!employee && pathname !== '/') {
    return null;
  }

  if (employee && pathname !== '/' && !canAccessRoute(employee.role, pathname)) {
    return null;
  }

  return <>{children}</>;
}
