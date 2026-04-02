'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useState } from 'react';
import { EmployeeSaveInput, PublicEmployee } from '@/lib/types';
import FormField from '@/components/admin/FormField';

type EmployeeFormData = EmployeeSaveInput & { password?: string };

type EmployeeFormProps = {
  initial?: Partial<PublicEmployee>;
  onSave: (data: EmployeeSaveInput) => Promise<void>;
  onCancel: () => void;
};

export default function EmployeeForm({ initial, onSave, onCancel }: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>({
    name: '',
    badge: '',
    role: 'mechanic',
    department: '',
    shift: 'A',
    password: '',
    ...initial,
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const setNextPreview = (nextUrl: string) => {
    setPreviewUrl((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return nextUrl;
    });
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Envie apenas arquivos de imagem.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 4MB.');
      return;
    }

    setNextPreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, photoFile: file, removePhoto: false }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.badge || !form.department) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!initial?.id && !form.password) {
      setError('Defina uma senha de 6 números para o funcionário.');
      return;
    }
    if (form.password && !/^\d{6}$/.test(form.password)) {
      setError('A senha deve conter exatamente 6 números.');
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const photoToDisplay = previewUrl || form.photoUrl;

  return (
    <div className="mb-4 animate-slide-up border-2 border-brand-black bg-white p-6">
      <h3
        className="mb-4 font-display text-xl font-black uppercase tracking-wider text-brand-black"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {initial?.id ? 'EDITAR FUNCIONÁRIO' : 'NOVO FUNCIONÁRIO'}
      </h3>

      <div className="mb-5 rounded-2xl border border-brand-gray-border bg-brand-gray-light p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-brand-gray-border bg-white">
            {photoToDisplay ? (
              <div className="relative h-full w-full">
                <Image
                  src={photoToDisplay}
                  alt="Pré-visualização do funcionário"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={photoToDisplay.startsWith('data:') || photoToDisplay.startsWith('blob:')}
                />
              </div>
            ) : (
              <span className="font-mono text-xs text-gray-400">Sem foto</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-gray-500">Foto do funcionario</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-xs text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-black file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-white hover:file:bg-brand-red"
            />
            <p className="mt-2 text-xs text-gray-500">Arquivo normal do computador, JPG ou PNG por exemplo.</p>
          </div>
          {photoToDisplay && (
            <button
              type="button"
              onClick={() => {
                setNextPreview('');
                setForm((current) => ({
                  ...current,
                  photoFile: null,
                  photoUrl: undefined,
                  removePhoto: Boolean(initial?.photoUrl),
                }));
              }}
              className="self-start rounded-xl border border-brand-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-brand-red hover:bg-red-50"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="Nome Completo *"
          value={form.name || ''}
          onChange={(value) => setForm({ ...form, name: value })}
        />
        <FormField
          label="Matrícula *"
          value={form.badge || ''}
          onChange={(value) => setForm({ ...form, badge: value.replace(/\D/g, '') })}
          mono
          inputMode="numeric"
          placeholder="555"
        />
        <FormField
          label={initial?.id ? 'Nova Senha (6 números)' : 'Senha (6 números) *'}
          value={form.password || ''}
          onChange={(value) => setForm({ ...form, password: value.replace(/\D/g, '').slice(0, 6) })}
          mono
          type="password"
          inputMode="numeric"
          placeholder={initial?.id ? 'Deixe em branco para manter' : '000000'}
        />

        <div>
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-gray-500">Cargo</label>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as 'mechanic' | 'admin' })}
            className="w-full border-2 border-brand-gray-border bg-white px-3 py-2.5 font-mono text-sm focus:border-brand-red focus:outline-none"
          >
            <option value="mechanic">Mecânico</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-gray-500">Turno</label>
          <select
            value={form.shift}
            onChange={(event) => setForm({ ...form, shift: event.target.value as 'A' | 'B' | 'C' })}
            className="w-full border-2 border-brand-gray-border bg-white px-3 py-2.5 font-mono text-sm focus:border-brand-red focus:outline-none"
          >
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
          </select>
        </div>

        <FormField
          label="Setor/Departamento *"
          value={form.department || ''}
          onChange={(value) => setForm({ ...form, department: value })}
        />
      </div>

      {initial?.id && (
        <p className="mt-3 text-xs text-gray-500">Se a senha ficar em branco, a atual será mantida.</p>
      )}
      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1" style={{ fontFamily: "var(--font-display)" }}>
          CANCELAR
        </button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-[2]" style={{ fontFamily: "var(--font-display)" }}>
          {saving ? 'SALVANDO...' : 'SALVAR'}
        </button>
      </div>
    </div>
  );
}
