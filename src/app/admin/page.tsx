'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import EmployeeForm from '@/components/admin/EmployeeForm';
import EmployeesGrid from '@/components/admin/EmployeesGrid';
import { classifyEmployeeSpecialty, EmployeeSpecialty } from '@/components/admin/helpers';
import ToolForm from '@/components/admin/ToolForm';
import ToolsTable from '@/components/admin/ToolsTable';
import { EmployeeSaveInput, PublicEmployee, Tool, ToolSaveInput } from '@/lib/types';
import {
  fetchAdminData,
  removeEmployee,
  removeTool,
  saveEmployee,
  saveTool,
} from '@/lib/services/admin';

type AdminTab = 'tools' | 'employees';

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('tools');
  const [tools, setTools] = useState<Tool[]>([]);
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editEmp, setEditEmp] = useState<PublicEmployee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchTools, setSearchTools] = useState('');
  const [searchEmployees, setSearchEmployees] = useState('');
  const [employeeSpecialtyFilter, setEmployeeSpecialtyFilter] = useState<'all' | EmployeeSpecialty>('all');

  const loadData = async () => {
    try {
      const { tools: nextTools, employees: nextEmployees } = await fetchAdminData();
      setTools(nextTools);
      setEmployees(nextEmployees);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao carregar dados.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTool = async (data: ToolSaveInput) => {
    await saveTool(data, editTool?.id);
    setShowToolForm(false);
    setEditTool(null);
    await loadData();
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      await removeTool(toolId);
      setDeleteConfirm(null);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao remover ferramenta.');
    }
  };

  const handleSaveEmployee = async (data: EmployeeSaveInput) => {
    await saveEmployee(data, editEmp?.id);
    setShowEmpForm(false);
    setEditEmp(null);
    await loadData();
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await removeEmployee(employeeId);
      setDeleteConfirm(null);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao remover funcionário.');
    }
  };

  const filteredTools = tools.filter((tool) => {
    if (!searchTools) return true;

    const query = searchTools.toLowerCase();
    return tool.name.toLowerCase().includes(query) || tool.code.toLowerCase().includes(query);
  });

  const filteredEmployees = employees.filter((employee) => {
    const query = searchEmployees.toLowerCase().trim();
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

        {error && (
          <div className="mb-4 flex items-center justify-between border-l-4 border-brand-red bg-red-50 p-3">
            <p className="text-sm font-medium text-brand-red">{error}</p>
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
                className="btn-primary ml-4 rounded-lg px-5 py-2.5 text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                + NOVA FERRAMENTA
              </button>
            </div>

            {showToolForm && !editTool && (
              <ToolForm onSave={handleSaveTool} onCancel={() => setShowToolForm(false)} />
            )}

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
                className="btn-primary ml-4 rounded-lg px-5 py-2.5 text-sm"
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
          </div>
        )}
      </div>
    </div>
  );
}
