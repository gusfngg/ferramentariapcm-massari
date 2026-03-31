import { NextResponse } from 'next/server';
import { deleteToolById, getToolById, hasActiveWithdrawalForTool, updateTool } from '@/lib/db';
import { Tool } from '@/lib/types';
import { removeStoredImage, saveUploadedImage, UploadValidationError } from '@/lib/uploads';

const ALLOWED_CATEGORIES: Tool['category'][] = ['hand', 'power', 'measuring', 'electrical', 'cutting'];
const ALLOWED_CONDITIONS: Tool['condition'][] = ['good', 'fair', 'maintenance'];

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const tool = getToolById(params.id);

    if (!tool) return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });

    const removePhoto = String(formData.get('removePhoto') || '') === '1';
    const photoInput = formData.get('photo');

    let nextPhotoUrl = tool.photoUrl;
    if (photoInput instanceof File && photoInput.size > 0) {
      const uploadedUrl = await saveUploadedImage(photoInput, 'tools');
      removeStoredImage(tool.photoUrl);
      nextPhotoUrl = uploadedUrl;
    } else if (removePhoto) {
      removeStoredImage(tool.photoUrl);
      nextPhotoUrl = undefined;
    }

    const nameInput = formData.get('name');
    const categoryInput = formData.get('category');
    const codeInput = formData.get('code');
    const descriptionInput = formData.get('description');
    const availableInput = formData.get('available');
    const conditionInput = formData.get('condition');
    const locationInput = formData.get('location');
    const nextCategory =
      categoryInput !== null && String(categoryInput).trim() !== ''
        ? String(categoryInput).trim()
        : undefined;
    const nextCondition =
      conditionInput !== null && String(conditionInput).trim() !== ''
        ? String(conditionInput).trim()
        : undefined;

    if (nextCategory && !ALLOWED_CATEGORIES.includes(nextCategory as Tool['category'])) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
    }

    if (nextCondition && !ALLOWED_CONDITIONS.includes(nextCondition as Tool['condition'])) {
      return NextResponse.json({ error: 'Condição inválida' }, { status: 400 });
    }

    const nextTool = {
      ...tool,
      name: nameInput !== null ? String(nameInput).trim() : tool.name,
      category: nextCategory
        ? (nextCategory as Tool['category'])
        : tool.category,
      code: codeInput !== null ? String(codeInput).trim() : tool.code,
      description: descriptionInput !== null ? String(descriptionInput).trim() : tool.description,
      available:
        availableInput !== null
          ? String(availableInput) === '1'
          : tool.available,
      condition: nextCondition
        ? (nextCondition as Tool['condition'])
        : tool.condition,
      location: locationInput !== null ? String(locationInput).trim() : tool.location,
      photoUrl: nextPhotoUrl,
    };
    const savedTool = updateTool(nextTool);

    return NextResponse.json(savedTool || nextTool);
  } catch (caughtError) {
    if (caughtError instanceof UploadValidationError) {
      return NextResponse.json({ error: caughtError.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar ferramenta' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const tool = getToolById(params.id);

    if (!tool) return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });

    const hasActive = hasActiveWithdrawalForTool(params.id);
    if (hasActive) {
      return NextResponse.json(
        { error: 'Ferramenta está em uso. Aguarde a devolução.' },
        { status: 400 }
      );
    }

    removeStoredImage(tool.photoUrl);
    deleteToolById(params.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao remover ferramenta' }, { status: 500 });
  }
}
