import { NextResponse } from 'next/server';
import { sanitizeEmployee } from '@/lib/auth';
import { getEmployeeByBadgeAndPassword } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const badge = String(body.badge || '');
    const password = String(body.password || '');

    if (!badge || !password) {
      return NextResponse.json({ error: 'Informe a matrícula e a senha' }, { status: 400 });
    }

    const employee = await getEmployeeByBadgeAndPassword(badge, password);

    if (!employee) {
      return NextResponse.json({ error: 'Matrícula ou senha inválida' }, { status: 401 });
    }

    return NextResponse.json(sanitizeEmployee(employee));
  } catch {
    return NextResponse.json({ error: 'Erro ao realizar login' }, { status: 500 });
  }
}
