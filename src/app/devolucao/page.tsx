'use client';

import Image from 'next/image';
import { useDeferredValue, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { Withdrawal } from '@/lib/types';
import ToolIcon from '@/components/ToolIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { employeesQueryOptions, queryKeys, toolsQueryOptions, withdrawalsQueryOptions } from '@/lib/query';
import clsx from 'clsx';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}min`;
  return `${mins}min`;
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DevolucaoPage() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const [search, setSearch] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
  const [returning, setReturning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState('');
  const deferredSearch = useDeferredValue(search);

  const employeesQuery = useQuery(employeesQueryOptions);
  const toolsQuery = useQuery(toolsQueryOptions);
  const withdrawalsQuery = useQuery(withdrawalsQueryOptions);

  const employees = employeesQuery.data ?? [];
  const tools = toolsQuery.data ?? [];
  const withdrawals = withdrawalsQuery.data ?? [];
  const queryError =
    (employeesQuery.error instanceof Error && employeesQuery.error.message) ||
    (toolsQuery.error instanceof Error && toolsQuery.error.message) ||
    (withdrawalsQuery.error instanceof Error && withdrawalsQuery.error.message) ||
    '';
  const isLoading = employeesQuery.isLoading || toolsQuery.isLoading || withdrawalsQuery.isLoading;

  const activeWithdrawals = withdrawals.filter((w) => w.status === 'active');
  const canReturnAnyTool = employee?.role === 'admin';
  const scopedWithdrawals = canReturnAnyTool
    ? activeWithdrawals
    : activeWithdrawals.filter((withdrawal) => withdrawal.employeeId === employee?.id);

  const filteredEmployeesWithTools = employees.filter((emp) => {
    const hasActive = scopedWithdrawals.some((w) => w.employeeId === emp.id);
    const matchSearch = deferredSearch === '' ||
      emp.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      emp.badge.toLowerCase().includes(deferredSearch.toLowerCase());
    return hasActive && matchSearch;
  });

  const getEmployeeWithdrawals = (empId: string) =>
    scopedWithdrawals.filter((w) => w.employeeId === empId);

  const getTool = (toolId: string) => tools.find((t) => t.id === toolId);
  const isEmployeeExpanded = (employeeId: string) => expandedEmployees[employeeId] ?? false;
  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees((current) => ({ ...current, [employeeId]: !current[employeeId] }));
  };

  const handleReturn = async (withdrawalId: string) => {
    setReturning(withdrawalId);
    setError('');
    try {
      const res = await fetch(`/api/withdrawals/${withdrawalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'returned' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao registrar devolução');
        return;
      }

      setSuccess(withdrawalId);
      queryClient.setQueryData<Withdrawal[]>(queryKeys.withdrawals, (current = []) =>
          current.map((wd) =>
            wd.id === withdrawalId
              ? { ...wd, status: 'returned', returnedAt: new Date().toISOString() }
              : wd
          )
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tools });
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setReturning(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 bg-brand-black text-white flex items-center justify-center font-display font-black text-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ↩
            </span>
            <h1
              className="font-display text-3xl font-semibold tracking-[0.02em] text-brand-black"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Devolução de Ferramentas
            </h1>
          </div>
          <div className="rounded-xl bg-brand-red px-4 py-2 font-mono text-sm font-bold text-white shadow-[0_10px_20px_-16px_rgba(220,38,38,0.8)]">
            {scopedWithdrawals.length} em uso
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <input
            type="text"
            placeholder={canReturnAnyTool ? 'Buscar por nome ou matrícula...' : 'Buscar suas ferramentas...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-gray-border bg-white px-4 py-3 pr-10 font-mono text-sm shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)] transition-colors focus:border-brand-red focus:outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {(error || queryError) && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-brand-red text-sm font-medium">{error || queryError}</p>
          </div>
        )}

        {!canReturnAnyTool && (
          <div className="mb-4 rounded-xl border border-brand-gray-border bg-brand-gray-light p-3">
            <p className="text-brand-black text-sm font-medium">Voce pode devolver apenas as ferramentas retiradas na sua matricula.</p>
          </div>
        )}

        {canReturnAnyTool && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-brand-black text-sm font-medium">Como admin, voce pode devolver qualquer ferramenta registrada no sistema.</p>
          </div>
        )}

        {isLoading ? (
          <DevolucaoSkeleton />
        ) : filteredEmployeesWithTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p
              className="font-display text-2xl font-semibold tracking-[0.02em] text-gray-400"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {search ? 'Nenhum resultado encontrado' : 'Nenhuma ferramenta em uso'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEmployeesWithTools.map((emp) => {
              const empWithdrawals = getEmployeeWithdrawals(emp.id);
              const isExpanded = isEmployeeExpanded(emp.id);
              const shouldShowTools = !canReturnAnyTool || isExpanded;
              return (
                <div
                  key={emp.id}
                  className="animate-fade-in overflow-hidden rounded-2xl border border-brand-gray-border bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]"
                >
                  {/* Employee header */}
                  <div className="flex items-center gap-4 border-b border-brand-gray-border/80 bg-brand-gray-light/70 px-5 py-4">
                    <div
                      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-black font-display font-black text-base text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {emp.photoUrl ? (
                        <Image
                          src={emp.photoUrl}
                          alt={emp.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized={emp.photoUrl.startsWith('data:') || emp.photoUrl.startsWith('blob:')}
                        />
                      ) : (
                        getInitials(emp.name)
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-brand-black">{emp.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-brand-black px-3 py-1 font-mono text-xs font-bold text-white">
                        {empWithdrawals.length} ferramenta{empWithdrawals.length !== 1 ? 's' : ''}
                      </div>
                      {canReturnAnyTool && (
                        <button
                          onClick={() => toggleEmployee(emp.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-gray-border bg-white text-brand-black transition-colors hover:border-brand-black"
                          aria-label={isExpanded ? `Recolher ${emp.name}` : `Expandir ${emp.name}`}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tools list */}
                  {shouldShowTools && (
                    <div className="divide-y divide-brand-gray-border">
                      {empWithdrawals.map((wd) => {
                        const tool = getTool(wd.toolId);
                        if (!tool) return null;
                        const isReturning = returning === wd.id;
                        const isSuccess = success === wd.id;
                        const isLate = wd.expectedReturnAt ? new Date(wd.expectedReturnAt).getTime() < Date.now() : false;

                        return (
                          <div key={wd.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-red-50/40">
                            {/* Tool icon */}
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-brand-gray-border bg-brand-gray-light">
                              <ToolIcon category={tool.category} size={40} color="#DC2626" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-brand-black text-sm">{tool.name}</p>
                              <p className="font-mono text-xs text-brand-red">{tool.code}</p>
                              <p className="mt-0.5 text-xs font-bold text-gray-500">
                                Retirado: {new Date(wd.withdrawnAt).toLocaleString('pt-BR', {
                                  day: '2-digit', month: '2-digit',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                Prevista: {formatDateTime(wd.expectedReturnAt)}
                              </p>
                              <p className="mt-0.5 text-xs font-bold text-gray-500">
                                Centro de Custo: {wd.costCenter || 'Não informado'}
                              </p>
                            </div>

                            {/* Time badge */}
                            <div className="text-center">
                              <div className={clsx(
                                'rounded-full px-3 py-1 font-mono text-xs font-bold',
                                timeSince(wd.withdrawnAt).includes('d')
                                  ? 'bg-red-100 text-red-700'
                                  : timeSince(wd.withdrawnAt).includes('h')
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              )}>
                                {timeSince(wd.withdrawnAt)}
                              </div>
                              <p className={clsx('mt-0.5 text-xs', isLate ? 'font-bold text-brand-red' : 'text-gray-400')}>
                                {isLate ? 'fora do prazo' : 'em uso'}
                              </p>
                            </div>

                            {/* Return button */}
                            <button
                              onClick={() => handleReturn(wd.id)}
                              disabled={isReturning}
                              className={clsx(
                                'flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-3 font-display text-sm font-black uppercase tracking-wider transition-all duration-200',
                                isSuccess
                                  ? 'bg-green-600 text-white'
                                  : 'bg-brand-red text-white hover:bg-brand-red-dark active:scale-95',
                                isReturning && 'opacity-70 cursor-not-allowed'
                              )}
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {isReturning ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : isSuccess ? '✓ DEVOLVIDO' : '↩ DEVOLVER'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DevolucaoSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-brand-gray-border bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
