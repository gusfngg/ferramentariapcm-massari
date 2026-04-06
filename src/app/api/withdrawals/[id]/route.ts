import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getWithdrawalById, returnWithdrawal } from '@/lib/db';
export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const withdrawal = await getWithdrawalById(params.id);

    if (!withdrawal) return NextResponse.json({ error: 'Retirada não encontrada' }, { status: 404 });
    if (withdrawal.status === 'returned') {
      return NextResponse.json({ error: 'Esta retirada já foi devolvida' }, { status: 400 });
    }

    const updatedWithdrawal = await returnWithdrawal(params.id, {
      notes: body.notes,
      condition: body.condition,
    });

    if (!updatedWithdrawal) {
      return NextResponse.json({ error: 'Retirada não encontrada' }, { status: 404 });
    }
    revalidateTag('withdrawals');
    revalidateTag('tools');

    return NextResponse.json(updatedWithdrawal);
  } catch (caughtError) {
    console.error('Withdrawals PUT error:', caughtError);
    return NextResponse.json({ error: 'Erro ao registrar devolução' }, { status: 500 });
  }
}
