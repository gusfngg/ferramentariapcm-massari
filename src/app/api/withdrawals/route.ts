import { NextResponse } from 'next/server';
import { createWithdrawal, getEmployeeById, getToolById, getWithdrawals } from '@/lib/db';
import { Withdrawal } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(await getWithdrawals(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar retiradas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expectedReturnTime = String(body.expectedReturnTime || '');
    const costCenter = String(body.costCenter || '').trim();
    const serviceOrder = String(body.serviceOrder || '').trim();

    // Check tool availability
    const tool = await getToolById(body.toolId);
    if (!tool) return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });
    if (!tool.available) return NextResponse.json({ error: 'Ferramenta indisponível' }, { status: 400 });
    if (tool.condition === 'maintenance') return NextResponse.json({ error: 'Ferramenta em manutenção' }, { status: 400 });

    // Check employee exists
    const employee = await getEmployeeById(body.employeeId);
    if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });

    if (!/^\d{2}:\d{2}$/.test(expectedReturnTime)) {
      return NextResponse.json({ error: 'Selecione uma hora prevista de devolução válida' }, { status: 400 });
    }

    if (!costCenter) {
      return NextResponse.json({ error: 'Informe o centro de custo de uso da ferramenta' }, { status: 400 });
    }
    if (!serviceOrder) {
      return NextResponse.json({ error: 'Informe a ordem de serviço' }, { status: 400 });
    }

    const withdrawnAt = new Date();
    const [hours, minutes] = expectedReturnTime.split(':').map(Number);
    const expectedReturnAt = new Date(withdrawnAt);
    expectedReturnAt.setHours(hours, minutes, 0, 0);

    if (expectedReturnAt.getTime() <= withdrawnAt.getTime()) {
      return NextResponse.json(
        { error: 'A devolução prevista deve ser para um horário futuro do mesmo dia' },
        { status: 400 }
      );
    }

    const newWithdrawal: Withdrawal = {
      id: `wd-${uuidv4().split('-')[0]}`,
      toolId: body.toolId,
      employeeId: body.employeeId,
      withdrawnAt: withdrawnAt.toISOString(),
      expectedReturnAt: expectedReturnAt.toISOString(),
      status: 'active',
      costCenter,
      notes: `OS: ${serviceOrder}`,
    };

    await createWithdrawal(newWithdrawal);

    return NextResponse.json(newWithdrawal, { status: 201 });
  } catch (caughtError) {
    console.error('Withdrawals POST error:', caughtError);
    const code = caughtError instanceof Error ? caughtError.message : '';
    if (code === 'TOOL_NOT_FOUND') {
      return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });
    }
    if (code === 'TOOL_UNAVAILABLE') {
      return NextResponse.json({ error: 'Ferramenta indisponível' }, { status: 400 });
    }
    if (code === 'TOOL_MAINTENANCE') {
      return NextResponse.json({ error: 'Ferramenta em manutenção' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao registrar retirada' }, { status: 500 });
  }
}
