import { NextResponse } from 'next/server';
import { getDatabaseSnapshot } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getDatabaseSnapshot();
    return NextResponse.json(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        counts: {
          employees: snapshot.employees.length,
          tools: snapshot.tools.length,
          withdrawals: snapshot.withdrawals.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (caughtError) {
    console.error('Health check error:', caughtError);
    return NextResponse.json(
      {
        ok: false,
        error: 'Falha ao conectar no banco',
      },
      { status: 500 }
    );
  }
}
