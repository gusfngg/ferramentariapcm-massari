'use client';

import clsx from 'clsx';
import Image from 'next/image';
import EmployeeForm from '@/components/admin/EmployeeForm';
import InfoRow from '@/components/admin/InfoRow';
import { ROLE_LABEL } from '@/components/admin/constants';
import { getInitials } from '@/components/admin/helpers';
import { EmployeeSaveInput, PublicEmployee } from '@/lib/types';

type EmployeesGridProps = {
  employees: PublicEmployee[];
  editEmployee: PublicEmployee | null;
  showEmployeeForm: boolean;
  deleteConfirm: string | null;
  onEdit: (employee: PublicEmployee) => void;
  onRequestDelete: (employeeId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (employeeId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: EmployeeSaveInput) => Promise<void>;
};

export default function EmployeesGrid({
  employees,
  editEmployee,
  showEmployeeForm,
  deleteConfirm,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onCancelEdit,
  onSaveEdit,
}: EmployeesGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          deleteConfirm={deleteConfirm}
          editEmployee={editEmployee}
          showEmployeeForm={showEmployeeForm}
          onEdit={() => onEdit(employee)}
          onRequestDelete={() => onRequestDelete(employee.id)}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={() => onConfirmDelete(employee.id)}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
        />
      ))}
    </div>
  );
}

type EmployeeCardProps = {
  employee: PublicEmployee;
  deleteConfirm: string | null;
  editEmployee: PublicEmployee | null;
  showEmployeeForm: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: EmployeeSaveInput) => Promise<void>;
};

function EmployeeCard({
  employee,
  deleteConfirm,
  editEmployee,
  showEmployeeForm,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onCancelEdit,
  onSaveEdit,
}: EmployeeCardProps) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-brand-gray-border bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)]">
        <div className="flex items-center gap-3 border-b border-brand-gray-border/80 bg-brand-gray-light/60 p-4">
          <div
            className={clsx(
              'relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-gray-border font-display text-base font-black text-white',
              employee.role === 'mechanic' ? 'bg-brand-black' : 'bg-brand-red'
            )}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {employee.photoUrl ? (
              <Image
                src={employee.photoUrl}
                alt={employee.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={employee.photoUrl.startsWith('data:') || employee.photoUrl.startsWith('blob:')}
              />
            ) : (
              getInitials(employee.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-black">{employee.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABEL[employee.role]}</p>
          </div>
        </div>

        <div className="space-y-1 p-4">
          <InfoRow label="Matrícula" value={employee.badge} mono />
          <InfoRow label="Setor" value={employee.department} />
          <InfoRow label="Turno" value={`Turno ${employee.shift}`} />
          <InfoRow label="Acesso" value="Senha de 6 dígitos" />
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            onClick={onEdit}
            className="flex-1 rounded-lg border border-brand-black px-3 py-2 text-xs font-bold uppercase text-brand-black transition-colors hover:bg-brand-black hover:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Editar
          </button>
          <button
            onClick={onRequestDelete}
            className="flex-1 rounded-lg border border-brand-red px-3 py-2 text-xs font-bold uppercase text-brand-red transition-colors hover:bg-brand-red hover:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Remover
          </button>
        </div>

        {deleteConfirm === employee.id && (
          <div className="border-t border-brand-gray-border bg-red-50 px-4 py-3">
            <p className="mb-2 text-xs font-bold text-brand-red">Remover {employee.name}?</p>
            <div className="flex gap-2">
              <button
                onClick={onCancelDelete}
                className="flex-1 rounded-lg border border-gray-400 py-1.5 text-xs font-bold uppercase text-gray-600 hover:bg-gray-100"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Não
              </button>
              <button
                onClick={onConfirmDelete}
                className="flex-1 rounded-lg bg-brand-red py-1.5 text-xs font-bold uppercase text-white hover:bg-brand-red-dark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sim, remover
              </button>
            </div>
          </div>
        )}
      </div>

      {editEmployee?.id === employee.id && showEmployeeForm && (
        <div className="sm:col-span-2 lg:col-span-3">
          <EmployeeForm initial={editEmployee} onSave={onSaveEdit} onCancel={onCancelEdit} />
        </div>
      )}
    </>
  );
}
