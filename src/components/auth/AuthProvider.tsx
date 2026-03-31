'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isSupremeAdmin } from '@/lib/auth';
import { PublicEmployee } from '@/lib/types';
import { INACTIVITY_TIMEOUT_MS, SESSION_KEY } from '@/lib/session';

type AuthContextValue = {
  employee: PublicEmployee | null;
  isReady: boolean;
  wasTimedOut: boolean;
  login: (employee: PublicEmployee) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<PublicEmployee | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [wasTimedOut, setWasTimedOut] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_KEY);

    if (stored) {
      try {
        setEmployee(JSON.parse(stored) as PublicEmployee);
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !employee) return;

    let timeoutId: number | undefined;
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
    ];

    const resetTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setEmployee(null);
        setWasTimedOut(true);
        window.localStorage.removeItem(SESSION_KEY);
      }, INACTIVITY_TIMEOUT_MS);
    };

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetTimeout, { passive: true })
    );
    resetTimeout();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimeout));
    };
  }, [employee, isReady]);

  useEffect(() => {
    if (!isReady || !employee) return;
    if (isSupremeAdmin(employee)) return;

    let isDisposed = false;

    const validateCurrentEmployee = async () => {
      try {
        const response = await fetch('/api/employees', { cache: 'no-store' });
        if (!response.ok || isDisposed) return;

        const currentEmployees = (await response.json()) as PublicEmployee[];
        const stillExists = currentEmployees.some((item) => item.id === employee.id);

        if (!stillExists && !isDisposed) {
          setEmployee(null);
          setWasTimedOut(false);
          window.localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        // Ignore transient failures; next validation attempt will retry.
      }
    };

    validateCurrentEmployee();
    const intervalId = window.setInterval(validateCurrentEmployee, 15000);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [employee, isReady]);

  const value = useMemo<AuthContextValue>(
    () => ({
      employee,
      isReady,
      wasTimedOut,
      login: (nextEmployee) => {
        setEmployee(nextEmployee);
        setWasTimedOut(false);
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextEmployee));
      },
      logout: () => {
        setEmployee(null);
        setWasTimedOut(false);
        window.localStorage.removeItem(SESSION_KEY);
      },
    }),
    [employee, isReady, wasTimedOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
