'use client';

import Image from 'next/image';
import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Withdrawal } from '@/lib/types';
import ToolIcon from '@/components/ToolIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { employeesQueryOptions, toolsQueryOptions, withdrawalsQueryOptions } from '@/lib/query';
import clsx from 'clsx';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function duration(start: string, end?: string) {
  const diff = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
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

function isOverdue(withdrawal: Withdrawal, now = Date.now()) {
  if (withdrawal.status !== 'active' || !withdrawal.expectedReturnAt) return false;
  return new Date(withdrawal.expectedReturnAt).getTime() < now;
}

export default function HistoricoPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'returned' | 'overdue' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'mechanic' | 'electrician' | 'admin'>('all');
  const deferredSearch = useDeferredValue(search);

  const employeesQuery = useQuery(employeesQueryOptions);
  const toolsQuery = useQuery(toolsQueryOptions);
  const withdrawalsQuery = useQuery(withdrawalsQueryOptions);

  const employees = employeesQuery.data ?? [];
  const tools = toolsQuery.data ?? [];
  const withdrawals = withdrawalsQuery.data ?? [];
  const isLoading = employeesQuery.isLoading || toolsQuery.isLoading || withdrawalsQuery.isLoading;
  const loadError =
    (employeesQuery.error instanceof Error && employeesQuery.error.message) ||
    (toolsQuery.error instanceof Error && toolsQuery.error.message) ||
    (withdrawalsQuery.error instanceof Error && withdrawalsQuery.error.message) ||
    '';

  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const getTool = (id: string) => tools.find((t) => t.id === id);
  const now = Date.now();

  const filtered = withdrawals.filter((wd) => {
    const emp = getEmployee(wd.employeeId);
    const tool = getTool(wd.toolId);
    if (!emp || !tool) return false;

    const matchSearch =
      deferredSearch === '' ||
      emp.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      tool.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      tool.code.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      emp.badge.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      (wd.costCenter || '').toLowerCase().includes(deferredSearch.toLowerCase());

    const overdue = isOverdue(wd, now);
    const pending = wd.status === 'active' && !overdue;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && wd.status === 'active') ||
      (statusFilter === 'returned' && wd.status === 'returned') ||
      (statusFilter === 'overdue' && overdue) ||
      (statusFilter === 'pending' && pending);
    const matchRole = roleFilter === 'all' || emp.role === roleFilter;

    return matchSearch && matchStatus && matchRole;
  });

  const activeWithdrawals = withdrawals.filter((w) => w.status === 'active');
  const totalActive = activeWithdrawals.length;
  const totalReturned = withdrawals.filter((w) => w.status === 'returned').length;
  const totalOverdue = activeWithdrawals.filter((w) => isOverdue(w, now)).length;
  const totalPending = totalActive - totalOverdue;
  const totalWithoutForecast = activeWithdrawals.filter((w) => !w.expectedReturnAt).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 bg-brand-black text-white flex items-center justify-center font-display font-black text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ≡
              </span>
              <h1
                className="font-display text-3xl font-semibold tracking-[0.02em] text-brand-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Histórico de Retiradas
              </h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-5">
            <StatCard label="TOTAL DE REGISTROS" value={withdrawals.length} color="black" />
            <StatCard label="EM USO AGORA" value={totalActive} color="red" />
            <StatCard label="ATRASADAS" value={totalOverdue} color="red" />
            <StatCard label="PENDÊNCIAS" value={totalPending} color="amber" />
            <StatCard label="DEVOLVIDAS" value={totalReturned} color="gray" />
          </div>

          <div className="grid gap-3 mb-6 lg:grid-cols-3">
            <AlertCard
              title={totalOverdue > 0 ? `${totalOverdue} retirada(s) fora do prazo` : 'Sem atrasos no momento'}
              description={
                totalOverdue > 0
                  ? 'Cobrar devolução imediata das ferramentas atrasadas.'
                  : 'Todas as retiradas ativas estão no prazo previsto.'
              }
              color={totalOverdue > 0 ? 'red' : 'green'}
            />
            <AlertCard
              title={`${totalPending} pendência(s) de devolução`}
              description="Ferramentas ainda em uso e aguardando baixa no sistema."
              color="amber"
            />
            <AlertCard
              title={
                totalWithoutForecast > 0
                  ? `${totalWithoutForecast} retirada(s) sem previsão definida`
                  : 'Todas as retiradas ativas possuem previsão'
              }
              description={
                totalWithoutForecast > 0
                  ? 'Defina a previsão de devolução para reduzir risco de atraso.'
                  : 'Controle de previsão preenchido corretamente.'
              }
              color={totalWithoutForecast > 0 ? 'black' : 'green'}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <input
                type="text"
                placeholder="Buscar funcionário, ferramenta, código, centro de custo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-brand-gray-border bg-white px-4 py-2.5 pr-10 font-mono text-xs shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)] transition-colors focus:border-brand-red focus:outline-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex gap-1">
              {(['all', 'active', 'overdue', 'pending', 'returned'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors',
                    statusFilter === s
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-brand-gray-border bg-white text-gray-500 hover:border-brand-black hover:text-brand-black'
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s === 'all'
                    ? 'Todos'
                    : s === 'active'
                    ? 'Em Uso'
                    : s === 'overdue'
                    ? 'Atrasadas'
                    : s === 'pending'
                    ? 'Pendências'
                    : 'Devolvidos'}
                </button>
              ))}
            </div>

            <div className="flex gap-1">
              {(['all', 'mechanic', 'electrician', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={clsx(
                    'rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors',
                    roleFilter === r
                      ? 'border-brand-red bg-brand-red text-white'
                      : 'border-brand-gray-border bg-white text-gray-500 hover:border-brand-red hover:text-brand-red'
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {r === 'all' ? 'Todos' : r === 'mechanic' ? 'Mecânicos' : r === 'electrician' ? 'Eletricistas' : 'Admin'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loadError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-brand-red text-sm font-medium">{loadError}</p>
          </div>
        )}

        {isLoading ? (
          <HistoricoSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-display text-2xl font-semibold tracking-[0.02em] text-gray-400"
              style={{ fontFamily: "var(--font-display)" }}>
              Nenhum registro encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-gray-border bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-black/95 text-white">
                  {['DATA/HORA', 'FUNCIONÁRIO', 'FERRAMENTA', 'CENTRO DE CUSTO', 'PREVISÃO', 'DURAÇÃO', 'DEVOLUÇÃO', 'STATUS'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3.5 font-display font-black text-xs uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((wd, i) => {
                  const emp = getEmployee(wd.employeeId);
                  const tool = getTool(wd.toolId);
                  if (!emp || !tool) return null;
                  const overdue = isOverdue(wd, now);
                  const pending = wd.status === 'active' && !overdue;

                  return (
                    <tr
                      key={wd.id}
                      className={clsx(
                        'border-b border-brand-gray-border/80 transition-colors hover:bg-red-50/50',
                        overdue ? 'bg-red-50/70' : i % 2 === 0 ? 'bg-white' : 'bg-brand-gray-light/70'
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-brand-black font-bold">
                          {new Date(wd.withdrawnAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          {new Date(wd.withdrawnAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-black font-display font-black text-xs text-white"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {emp.photoUrl ? (
                              <Image
                                src={emp.photoUrl}
                                alt={emp.name}
                                fill
                                sizes="28px"
                                className="object-cover"
                                unoptimized={emp.photoUrl.startsWith('data:') || emp.photoUrl.startsWith('blob:')}
                              />
                            ) : (
                              getInitials(emp.name)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-brand-black">{emp.name}</p>
                            <p className="font-mono text-xs text-gray-400">{emp.badge}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ToolIcon category={tool.category} size={28} color="#DC2626" />
                          <div>
                            <p className="font-bold text-xs text-brand-black">{tool.name}</p>
                            <p className="font-mono text-xs text-brand-red">{tool.code}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-brand-black">
                          {wd.costCenter || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {formatDateTime(wd.expectedReturnAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {duration(wd.withdrawnAt, wd.returnedAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {wd.returnedAt ? (
                          <>
                            <p className="font-mono text-xs text-brand-black font-bold">
                              {new Date(wd.returnedAt).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="font-mono text-xs text-gray-400">
                              {new Date(wd.returnedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'inline-block rounded-full px-3 py-1 font-display font-black text-xs uppercase tracking-wider',
                            overdue
                              ? 'bg-brand-red text-white'
                              : pending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-brand-gray-light text-gray-600 border border-brand-gray-border'
                          )}
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {overdue ? 'ATRASADO' : pending ? 'PENDENTE' : 'DEVOLVIDO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <p className="px-4 pb-4 pt-4 text-xs font-mono text-gray-400">
              Exibindo {filtered.length} de {withdrawals.length} registros
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricoSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-gray-border bg-white p-4">
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'black' | 'red' | 'gray' | 'amber' }) {
  return (
    <div className={clsx(
      'rounded-2xl border px-5 py-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]',
      color === 'black' && 'bg-brand-black border-brand-black',
      color === 'red' && 'bg-brand-red border-brand-red',
      color === 'amber' && 'bg-amber-100 border-amber-300',
      color === 'gray' && 'bg-white border-brand-gray-border',
    )}>
      <p className={clsx(
        'font-mono text-xs uppercase tracking-wider mb-1',
        color === 'gray' && 'text-gray-500',
        color === 'amber' && 'text-amber-700',
        (color === 'black' || color === 'red') && 'text-white/60'
      )}>
        {label}
      </p>
      <p className={clsx(
        'font-display font-black text-4xl',
        color === 'gray' && 'text-brand-black',
        color === 'amber' && 'text-amber-900',
        (color === 'black' || color === 'red') && 'text-white'
      )} style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
    </div>
  );
}

function AlertCard({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: 'red' | 'amber' | 'black' | 'green';
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border px-4 py-3',
        color === 'red' && 'border-brand-red bg-red-50',
        color === 'amber' && 'border-amber-400 bg-amber-50',
        color === 'black' && 'border-brand-black bg-brand-gray-light',
        color === 'green' && 'border-green-600 bg-green-50'
      )}
    >
      <p className={clsx(
        'font-display font-black text-sm uppercase tracking-wider',
        color === 'red' && 'text-brand-red',
        color === 'amber' && 'text-amber-800',
        color === 'black' && 'text-brand-black',
        color === 'green' && 'text-green-700'
      )} style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </p>
      <p className="mt-1 font-mono text-xs text-gray-600">{description}</p>
    </div>
  );
}
