'use client';

import clsx from 'clsx';
import Image from 'next/image';
import ToolIcon from '@/components/ToolIcon';
import ToolForm from '@/components/admin/ToolForm';
import { Tool, ToolSaveInput } from '@/lib/types';

type ToolsTableProps = {
  tools: Tool[];
  editTool: Tool | null;
  showToolForm: boolean;
  deleteConfirm: string | null;
  onEdit: (tool: Tool) => void;
  onRequestDelete: (toolId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (toolId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: ToolSaveInput) => Promise<void>;
};

export default function ToolsTable({
  tools,
  editTool,
  showToolForm,
  deleteConfirm,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onCancelEdit,
  onSaveEdit,
}: ToolsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-gray-border bg-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
        <thead>
          <tr className="bg-brand-black/95 text-white">
            {['ÍCONE', 'NOME', 'CÓDIGO', 'CATEGORIA', 'LOCALIZAÇÃO', 'ESTADO', 'STATUS', 'AÇÕES'].map((header) => (
              <th
                key={header}
                className="px-4 py-3.5 text-left font-display text-xs font-black uppercase tracking-widest"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tools.map((tool, index) => (
            <ToolTableRow
              key={tool.id}
              tool={tool}
              index={index}
              editTool={editTool}
              showToolForm={showToolForm}
              deleteConfirm={deleteConfirm}
              onEdit={() => onEdit(tool)}
              onRequestDelete={() => onRequestDelete(tool.id)}
              onCancelDelete={onCancelDelete}
              onConfirmDelete={() => onConfirmDelete(tool.id)}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
            />
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

type ToolTableRowProps = {
  tool: Tool;
  index: number;
  editTool: Tool | null;
  showToolForm: boolean;
  deleteConfirm: string | null;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: ToolSaveInput) => Promise<void>;
};

function ToolTableRow({
  tool,
  index,
  editTool,
  showToolForm,
  deleteConfirm,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onCancelEdit,
  onSaveEdit,
}: ToolTableRowProps) {
  return (
    <>
      <tr
        className={clsx(
          'border-b border-brand-gray-border/80 transition-colors hover:bg-red-50/50',
          index % 2 === 0 ? 'bg-white' : 'bg-brand-gray-light/70'
        )}
      >
        <td className="px-4 py-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-brand-gray-border bg-white">
            {tool.photoUrl ? (
              <Image
                src={tool.photoUrl}
                alt={tool.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={tool.photoUrl.startsWith('data:') || tool.photoUrl.startsWith('blob:')}
              />
            ) : (
              <ToolIcon category={tool.category} size={28} color="#DC2626" />
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-bold text-brand-black">{tool.name}</p>
          <p className="max-w-xs truncate text-xs text-gray-400">{tool.description}</p>
        </td>
        <td className="px-4 py-3 font-mono text-xs font-bold text-brand-red">{tool.code}</td>
        <td className="px-4 py-3 text-xs capitalize text-gray-600">{tool.category}</td>
        <td className="px-4 py-3 text-xs text-gray-600">{tool.location}</td>
        <td className="px-4 py-3">
          <span
            className={clsx(
              'rounded-full px-2.5 py-1 text-xs font-bold uppercase',
              tool.condition === 'good' && 'bg-green-100 text-green-700',
              tool.condition === 'fair' && 'bg-yellow-100 text-yellow-700',
              tool.condition === 'maintenance' && 'bg-red-100 text-red-700'
            )}
          >
            {tool.condition === 'good' ? 'Bom' : tool.condition === 'fair' ? 'Regular' : 'Manutenção'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={clsx(
              'rounded-full px-2.5 py-1 text-xs font-bold uppercase',
              tool.available ? 'bg-green-100 text-green-700' : 'bg-brand-red text-white'
            )}
          >
            {tool.available ? 'Disponível' : 'Em Uso'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg border border-brand-black px-3 py-1.5 text-xs font-bold uppercase text-brand-black transition-colors hover:bg-brand-black hover:text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Editar
            </button>
            <button
              onClick={onRequestDelete}
              className="rounded-lg border border-brand-red px-3 py-1.5 text-xs font-bold uppercase text-brand-red transition-colors hover:bg-brand-red hover:text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Remover
            </button>
          </div>
        </td>
      </tr>

      {editTool?.id === tool.id && showToolForm && (
        <tr>
          <td colSpan={8} className="bg-white p-0">
            <ToolForm initial={editTool} onSave={onSaveEdit} onCancel={onCancelEdit} />
          </td>
        </tr>
      )}

      {deleteConfirm === tool.id && (
        <tr>
          <td colSpan={8} className="bg-red-50 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-brand-red">
                Remover <span className="underline">{tool.name}</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onCancelDelete}
                  className="rounded-lg border border-gray-400 px-4 py-2 text-xs font-bold uppercase text-gray-600 hover:bg-gray-100"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase text-white hover:bg-brand-red-dark"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Confirmar Remoção
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
