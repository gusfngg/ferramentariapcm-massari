import { NextResponse } from 'next/server';
import { createEmployee, employeeBadgeExists, getEmployees } from '@/lib/db';
import { Employee } from '@/lib/types';
import { isSupremeAdmin, isValidBadge, isValidPin, sanitizeEmployee, SUPREME_ADMIN_BADGE } from '@/lib/auth';
import { saveUploadedImage, UploadValidationError } from '@/lib/uploads';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_ROLES: Employee['role'][] = ['mechanic', 'admin'];
const ALLOWED_SHIFTS: Employee['shift'][] = ['A', 'B', 'C'];
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(
      (await getEmployees()).filter((employee) => !isSupremeAdmin(employee)).map(sanitizeEmployee),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (caughtError) {
    console.error('Employees GET error:', caughtError);
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get('name') || '').trim();
    const role = String(formData.get('role') || '').trim();
    const badge = String(formData.get('badge') || '').trim();
    const department = String(formData.get('department') || '').trim();
    const shift = String(formData.get('shift') || '').trim();
    const password = String(formData.get('password') || '');

    if (!name || !role || !badge || !department || !shift) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    if (!isValidBadge(badge)) {
      return NextResponse.json({ error: 'A matrícula deve conter apenas números' }, { status: 400 });
    }

    if (!isValidPin(password)) {
      return NextResponse.json({ error: 'A senha deve conter exatamente 6 números' }, { status: 400 });
    }

    if (!ALLOWED_ROLES.includes(role as Employee['role'])) {
      return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 });
    }

    if (!ALLOWED_SHIFTS.includes(shift as Employee['shift'])) {
      return NextResponse.json({ error: 'Turno inválido' }, { status: 400 });
    }

    if (badge === SUPREME_ADMIN_BADGE) {
      return NextResponse.json({ error: 'Essa matrícula é reservada para o admin supremo.' }, { status: 400 });
    }

    const hasDuplicateBadge = await employeeBadgeExists(badge);
    if (hasDuplicateBadge) {
      return NextResponse.json({ error: 'Já existe um funcionário com essa matrícula' }, { status: 400 });
    }

    const photoInput = formData.get('photo');
    const photoUrl =
      photoInput instanceof File && photoInput.size > 0
        ? await saveUploadedImage(photoInput, 'employees')
        : undefined;

    const newEmployee: Employee = {
      id: `emp-${uuidv4().split('-')[0]}`,
      name,
      role: role as Employee['role'],
      badge,
      password,
      department,
      shift: shift as Employee['shift'],
      photoUrl,
    };

    await createEmployee(newEmployee);

    return NextResponse.json(sanitizeEmployee(newEmployee), { status: 201 });
  } catch (caughtError) {
    console.error('Employees POST error:', caughtError);
    if (caughtError instanceof UploadValidationError) {
      return NextResponse.json({ error: caughtError.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 });
  }
}
