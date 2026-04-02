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
  } catch (caughtError) {
    console.error('Login API error:', caughtError);

    const message = caughtError instanceof Error ? caughtError.message : 'Erro ao realizar login';
    const isDatabaseConfigError =
      message.includes('DATABASE_URL') ||
      message.includes('URL do banco inválida') ||
      message.includes('Protocolo inválido');

    return NextResponse.json(
      {
        error: message,
      },
      { status: isDatabaseConfigError ? 503 : 500 }
    );
  }
}
