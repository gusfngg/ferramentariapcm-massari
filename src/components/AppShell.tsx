'use client';

import AuthGate from '@/components/auth/AuthGate';
import { useAuth } from '@/components/auth/AuthProvider';
import Navbar from '@/components/Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { employee, isReady } = useAuth();
  const shouldShowNavbar = isReady && !!employee;

  return (
    <AuthGate>
      <Navbar />
      <main className={shouldShowNavbar ? 'min-h-screen bg-white pt-16' : 'min-h-screen bg-white'}>
        {children}
      </main>
    </AuthGate>
  );
}
