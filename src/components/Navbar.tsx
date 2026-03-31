'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/components/auth/AuthProvider';
import { canAccessRoute } from '@/lib/access';

const navLinks = [
  { href: '/', label: 'Retirada' },
  { href: '/devolucao', label: 'Devolução' },
  { href: '/historico', label: 'Histórico' },
  { href: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, logout } = useAuth();

  if (!employee) return null;

  const allowedLinks = navLinks.filter((link) => canAccessRoute(employee.role, link.href));

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-red">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M13.78 15.3L19.78 21.3L21.89 19.14L15.89 13.14L13.78 15.3M17.5 11.5C17.5 10.89 17.37 10.3 17.12 9.78L14.63 12.27L12.22 9.87L14.71 7.38C14.18 7.13 13.59 7 13 7C10.24 7 8 9.24 8 12C8 14.76 10.24 17 13 17C15.76 17 18 14.76 18 12L17.5 11.5Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <span
              className="font-display text-[17px] font-semibold leading-none tracking-[0.02em] text-brand-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sala de
            </span>
            <span
              className="ml-2 font-display text-[17px] font-semibold leading-none tracking-[0.02em] text-brand-red"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ferramentas
            </span>
            <p className="truncate text-xs text-gray-500">{employee.name} • {employee.badge}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {allowedLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3 py-2 font-display text-xs font-semibold tracking-[0.03em] transition-colors duration-150',
                  {
                    'bg-brand-red text-white': isActive,
                    'text-gray-500 hover:bg-red-50 hover:text-brand-red': !isActive,
                  }
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Clock />
          <button
            onClick={() => {
              logout();
              router.replace('/');
            }}
            className="rounded-lg border border-brand-gray-border px-3 py-2 text-xs font-medium text-brand-black transition-colors hover:border-brand-red hover:text-brand-red"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

function Clock() {
  const [time, setTime] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="hidden rounded-lg border border-brand-gray-border bg-white px-3 py-2 font-mono text-xs font-bold tracking-wide text-brand-red sm:inline-flex"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {time}
    </span>
  );
}
