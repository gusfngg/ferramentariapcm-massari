'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { canAccessRoute } from '@/lib/access';

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
        <div className="rounded-2xl border border-brand-gray-border bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
          Carregando...
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
