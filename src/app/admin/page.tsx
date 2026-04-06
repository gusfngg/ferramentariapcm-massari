'use client';

import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import EmployeeForm from '@/components/admin/EmployeeForm';
import EmployeesGrid from '@/components/admin/EmployeesGrid';
import { classifyEmployeeSpecialty, EmployeeSpecialty } from '@/components/admin/helpers';
import ToolForm from '@/components/admin/ToolForm';
import ToolsTable from '@/components/admin/ToolsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeSaveInput, PublicEmployee, Tool, ToolSaveInput } from '@/lib/types';
import { employeesQueryOptions, queryKeys, toolsQueryOptions } from '@/lib/query';
import { removeEmployee, removeTool, saveEmployee, saveTool } from '@/lib/services/admin';

type AdminTab = 'tools' | 'employees';

function sortToolsByName(items: Tool[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sortEmployeesByName(items: PublicEmployee[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('tools');
  const [showToolForm, setShowToolForm] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editEmp, setEditEmp] = useState<PublicEmployee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTools, setSearchTools] = useState('');
  const [searchEmployees, setSearchEmployees] = useState('');
  const [employeeSpecialtyFilter, setEmployeeSpecialtyFilter] = useState<'all' | EmployeeSpecialty>('all');
  const [isMutating, setIsMutating] = useState(false);
  const deferredToolSearch = useDeferredValue(searchTools);
  const deferredEmployeeSearch = useDeferredValue(searchEmployees);

  const toolsQuery = useQuery({
    ...toolsQueryOptions,
    select: (items) => sortToolsByName(items),
  });

  const employeesQuery = useQuery({
    ...employeesQueryOptions,
    select: (items) => sortEmployeesByName(items),
  });

  const tools = toolsQuery.data ?? [];
  const employees = employeesQuery.data ?? [];
  const isLoading = toolsQuery.isLoading || employeesQuery.isLoading;
  const queryError = useMemo(() => {
    if (toolsQuery.error instanceof Error) return toolsQuery.error.message;
    if (employeesQuery.error instanceof Error) return employeesQuery.error.message;
    return '';
  }, [employeesQuery.error, toolsQuery.error]);

  const handleSaveTool = async (data: ToolSaveInput) => {
    try {
      setIsMutating(true);
      setError('');
      const savedTool = await saveTool(data, editTool?.id);

      startTransition(() => {
        queryClient.setQueryData<Tool[]>(queryKeys.tools, (current = []) => {
          const merged = editTool
            ? current.map((tool) => (tool.id === savedTool.id ? savedTool : tool))
            : [savedTool, ...current];
          return sortToolsByName(merged);
        });
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tools });

      setShowToolForm(false);
      setEditTool(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao salvar ferramenta.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      setIsMutating(true);
      setError('');
      await removeTool(toolId);
      setDeleteConfirm(null);
      startTransition(() => {
        queryClient.setQueryData<Tool[]>(queryKeys.tools, (current = []) =>
          current.filter((tool) => tool.id !== toolId)
        );
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tools });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao remover ferramenta.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveEmployee = async (data: EmployeeSaveInput) => {
    try {
      setIsMutating(true);
      setError('');
      const savedEmployee = await saveEmployee(data, editEmp?.id);

      startTransition(() => {
        queryClient.setQueryData<PublicEmployee[]>(queryKeys.employees, (current = []) => {
          const merged = editEmp
            ? current.map((employee) => (employee.id === savedEmployee.id ? savedEmployee : employee))
            : [savedEmployee, ...current];
          return sortEmployeesByName(merged);
        });
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees });

      setShowEmpForm(false);
      setEditEmp(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao salvar funcionário.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      setIsMutating(true);
      setError('');
      await removeEmployee(employeeId);
      setDeleteConfirm(null);
      startTransition(() => {
        queryClient.setQueryData<PublicEmployee[]>(queryKeys.employees, (current = []) =>
          current.filter((employee) => employee.id !== employeeId)
        );
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao remover funcionário.');
    } finally {
      setIsMutating(false);
    }
  };

  const filteredTools = tools.filter((tool) => {
    if (!deferredToolSearch) return true;

    const query = deferredToolSearch.toLowerCase();
    return tool.name.toLowerCase().includes(query) || tool.code.toLowerCase().includes(query);
  });

  const filteredEmployees = employees.filter((employee) => {
    const query = deferredEmployeeSearch.toLowerCase().trim();
    const matchesSearch =
      !query || employee.name.toLowerCase().includes(query) || employee.badge.toLowerCase().includes(query);
    const matchesSpecialty =
      employeeSpecialtyFilter === 'all' || classifyEmployeeSpecialty(employee) === employeeSpecialtyFilter;

    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center bg-brand-red font-display text-sm font-black text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ⚙
          </span>
          <h1
            className="font-display text-3xl font-semibold tracking-[0.02em] text-brand-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Painel Administrativo
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex gap-0 border-b-2 border-brand-gray-border">
          {(['tools', 'employees'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={clsx(
                '-mb-0.5 border-b-4 px-8 py-3 font-display text-sm font-semibold tracking-[0.03em] transition-colors',
                tab === value
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-gray-400 hover:text-brand-black'
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {value === 'tools' ? `Ferramentas (${tools.length})` : `Funcionários (${employees.length})`}
            </button>
          ))}
        </div>

        {(error || queryError) && (
          <div className="mb-4 flex items-center justify-between border-l-4 border-brand-red bg-red-50 p-3">
            <p className="text-sm font-medium text-brand-red">{error || queryError}</p>
            <button onClick={() => setError('')} className="text-lg text-brand-red hover:text-brand-red-dark">
              ×
            </button>
          </div>
        )}

        {tab === 'tools' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="relative max-w-xs flex-1">
                <input
                  type="text"
                  placeholder="Buscar ferramentas..."
                  value={searchTools}
                  onChange={(event) => setSearchTools(event.target.value)}
                  className="w-full rounded-xl border border-brand-gray-border bg-white px-4 py-2.5 pr-10 font-mono text-xs shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)] focus:border-brand-red focus:outline-none"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
                <svg className="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                onClick={() => {
                  setShowToolForm(true);
                  setEditTool(null);
                }}
                disabled={isMutating}
                className={clsx(
                  'btn-primary ml-4 rounded-lg px-5 py-2.5 text-sm',
                  isMutating && 'cursor-not-allowed opacity-70'
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                + NOVA FERRAMENTA
              </button>
            </div>

            {showToolForm && !editTool && (
              <ToolForm onSave={handleSaveTool} onCancel={() => setShowToolForm(false)} />
            )}

            {isLoading ? (
              <AdminToolsSkeleton />
            ) : (
              <ToolsTable
                tools={filteredTools}
                editTool={editTool}
                showToolForm={showToolForm}
                deleteConfirm={deleteConfirm}
                onEdit={(tool) => {
                  setEditTool(tool);
                  setShowToolForm(true);
                }}
                onRequestDelete={(toolId) => setDeleteConfirm(toolId)}
                onCancelDelete={() => setDeleteConfirm(null)}
                onConfirmDelete={handleDeleteTool}
                onCancelEdit={() => {
                  setEditTool(null);
                  setShowToolForm(false);
                }}
                onSaveEdit={handleSaveTool}
              />
            )}
          </div>
        )}

        {tab === 'employees' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="relative max-w-xs flex-1">
                <input
                  type="text"
                  placeholder="Buscar funcionários..."
                  value={searchEmployees}
                  onChange={(event) => setSearchEmployees(event.target.value)}
                  className="w-full rounded-xl border border-brand-gray-border bg-white px-4 py-2.5 pr-10 font-mono text-xs shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)] focus:border-brand-red focus:outline-none"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <button
                onClick={() => {
                  setShowEmpForm(true);
                  setEditEmp(null);
                }}
                disabled={isMutating}
                className={clsx(
                  'btn-primary ml-4 rounded-lg px-5 py-2.5 text-sm',
                  isMutating && 'cursor-not-allowed opacity-70'
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                + NOVO FUNCIONÁRIO
              </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {[
                { value: 'all' as const, label: 'Todos' },
                { value: 'lubrication' as const, label: 'Lubrificação' },
                { value: 'electrical' as const, label: 'Elétrica' },
                { value: 'mechanics' as const, label: 'Mecânicos' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEmployeeSpecialtyFilter(option.value)}
                  className={clsx(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    employeeSpecialtyFilter === option.value
                      ? 'border-brand-red bg-brand-red text-white'
                      : 'border-brand-gray-border bg-white text-brand-black hover:border-brand-red hover:text-brand-red'
                  )}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {showEmpForm && !editEmp && (
              <EmployeeForm onSave={handleSaveEmployee} onCancel={() => setShowEmpForm(false)} />
            )}

            {isLoading ? (
              <AdminEmployeesSkeleton />
            ) : (
              <EmployeesGrid
                employees={filteredEmployees}
                editEmployee={editEmp}
                showEmployeeForm={showEmpForm}
                deleteConfirm={deleteConfirm}
                onEdit={(employee) => {
                  setEditEmp(employee);
                  setShowEmpForm(true);
                }}
                onRequestDelete={(employeeId) => setDeleteConfirm(employeeId)}
                onCancelDelete={() => setDeleteConfirm(null)}
                onConfirmDelete={handleDeleteEmployee}
                onCancelEdit={() => {
                  setEditEmp(null);
                  setShowEmpForm(false);
                }}
                onSaveEdit={handleSaveEmployee}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminToolsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-gray-border bg-white">
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

function AdminEmployeesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-brand-gray-border bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
