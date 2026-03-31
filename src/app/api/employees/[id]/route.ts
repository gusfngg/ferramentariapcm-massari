import { NextResponse } from 'next/server';
import {
  deleteWithdrawalsByEmployeeId,
  deleteEmployeeById,
  employeeBadgeExists,
  getEmployeeById,
  hasActiveWithdrawalForEmployee,
  updateEmployee,
} from '@/lib/db';
import { Employee } from '@/lib/types';
import { isSupremeAdmin, isValidBadge, isValidPin, sanitizeEmployee, SUPREME_ADMIN_BADGE } from '@/lib/auth';
import { removeStoredImage, saveUploadedImage, UploadValidationError } from '@/lib/uploads';

const ALLOWED_ROLES: Employee['role'][] = ['mechanic', 'admin'];
const ALLOWED_SHIFTS: Employee['shift'][] = ['A', 'B', 'C'];

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const employee = getEmployeeById(params.id);

    if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    if (isSupremeAdmin(employee)) {
      return NextResponse.json({ error: 'O admin supremo não pode ser alterado por esta tela.' }, { status: 403 });
    }

    const badgeInput = formData.get('badge');
    const passwordInput = formData.get('password');

    if (badgeInput !== null && String(badgeInput).trim() !== '') {
      const nextBadge = String(badgeInput).trim();
      if (!isValidBadge(nextBadge)) {
        return NextResponse.json({ error: 'A matrícula deve conter apenas números' }, { status: 400 });
      }

      if (nextBadge === SUPREME_ADMIN_BADGE) {
        return NextResponse.json({ error: 'Essa matrícula é reservada para o admin supremo.' }, { status: 400 });
      }

      const hasDuplicateBadge = employeeBadgeExists(nextBadge, params.id);
      if (hasDuplicateBadge) {
        return NextResponse.json({ error: 'Já existe um funcionário com essa matrícula' }, { status: 400 });
      }
    }

    if (passwordInput !== null && String(passwordInput) !== '') {
      if (!isValidPin(String(passwordInput))) {
        return NextResponse.json({ error: 'A senha deve conter exatamente 6 números' }, { status: 400 });
      }
    }

    const removePhoto = String(formData.get('removePhoto') || '') === '1';
    const photoInput = formData.get('photo');

    let nextPhotoUrl = employee.photoUrl;
    if (photoInput instanceof File && photoInput.size > 0) {
      const uploadedUrl = await saveUploadedImage(photoInput, 'employees');
      removeStoredImage(employee.photoUrl);
      nextPhotoUrl = uploadedUrl;
    } else if (removePhoto) {
      removeStoredImage(employee.photoUrl);
      nextPhotoUrl = undefined;
    }

    const nameInput = formData.get('name');
    const roleInput = formData.get('role');
    const departmentInput = formData.get('department');
    const shiftInput = formData.get('shift');
    const nextRole = roleInput !== null && String(roleInput).trim() !== '' ? String(roleInput).trim() : undefined;
    const nextShift = shiftInput !== null && String(shiftInput).trim() !== '' ? String(shiftInput).trim() : undefined;

    if (nextRole && !ALLOWED_ROLES.includes(nextRole as Employee['role'])) {
      return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 });
    }

    if (nextShift && !ALLOWED_SHIFTS.includes(nextShift as Employee['shift'])) {
      return NextResponse.json({ error: 'Turno inválido' }, { status: 400 });
    }

    const nextEmployee = {
      ...employee,
      name: nameInput !== null ? String(nameInput).trim() : employee.name,
      role: nextRole
        ? (nextRole as Employee['role'])
        : employee.role,
      department: departmentInput !== null ? String(departmentInput).trim() : employee.department,
      shift: nextShift
        ? (nextShift as Employee['shift'])
        : employee.shift,
      badge:
        badgeInput !== null && String(badgeInput).trim() !== ''
          ? String(badgeInput).trim()
          : employee.badge,
      password:
        passwordInput === null || String(passwordInput) === ''
          ? employee.password
          : String(passwordInput),
      photoUrl: nextPhotoUrl,
    };

    const savedEmployee = updateEmployee(nextEmployee);

    return NextResponse.json(sanitizeEmployee(savedEmployee || nextEmployee));
  } catch (caughtError) {
    if (caughtError instanceof UploadValidationError) {
      return NextResponse.json({ error: caughtError.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const employee = getEmployeeById(params.id);

    if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    if (isSupremeAdmin(employee)) {
      return NextResponse.json({ error: 'O admin supremo não pode ser removido.' }, { status: 403 });
    }

    const hasActive = hasActiveWithdrawalForEmployee(params.id);
    if (hasActive) {
      return NextResponse.json(
        { error: 'Funcionário possui ferramentas em uso. Devolva antes de remover.' },
        { status: 400 }
      );
    }

    // Remove histórico para permitir exclusão física do funcionário no SQLite (FK RESTRICT).
    deleteWithdrawalsByEmployeeId(params.id);
    removeStoredImage(employee.photoUrl);
    deleteEmployeeById(params.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao remover funcionário' }, { status: 500 });
  }
}
