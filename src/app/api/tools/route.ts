import { NextResponse } from 'next/server';
import { createTool, getTools } from '@/lib/db';
import { Tool } from '@/lib/types';
import { saveUploadedImage, UploadValidationError } from '@/lib/uploads';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_CATEGORIES: Tool['category'][] = ['hand', 'power', 'measuring', 'electrical', 'cutting'];
const ALLOWED_CONDITIONS: Tool['condition'][] = ['good', 'fair', 'maintenance'];
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(await getTools(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (caughtError) {
    console.error('Tools GET error:', caughtError);
    return NextResponse.json({ error: 'Erro ao buscar ferramentas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const condition = String(formData.get('condition') || 'good').trim();
    const location = String(formData.get('location') || '').trim();

    if (!name || !category || !code || !location) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    if (!ALLOWED_CATEGORIES.includes(category as Tool['category'])) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
    }

    if (!ALLOWED_CONDITIONS.includes(condition as Tool['condition'])) {
      return NextResponse.json({ error: 'Condição inválida' }, { status: 400 });
    }

    const photoInput = formData.get('photo');
    const photoUrl =
      photoInput instanceof File && photoInput.size > 0
        ? await saveUploadedImage(photoInput, 'tools')
        : undefined;

    const newTool: Tool = {
      id: `tool-${uuidv4().split('-')[0]}`,
      name,
      category: category as Tool['category'],
      code,
      description,
      available: true,
      condition: condition as Tool['condition'],
      location,
      photoUrl,
    };

    await createTool(newTool);

    return NextResponse.json(newTool, { status: 201 });
  } catch (caughtError) {
    console.error('Tools POST error:', caughtError);
    if (caughtError instanceof UploadValidationError) {
      return NextResponse.json({ error: caughtError.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar ferramenta' }, { status: 500 });
  }
}
