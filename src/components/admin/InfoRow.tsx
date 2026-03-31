'use client';

import clsx from 'clsx';

type InfoRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

export default function InfoRow({ label, value, mono = false }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="font-mono text-xs text-gray-400">{label}</span>
      <span className={clsx('text-xs font-bold text-brand-black', mono && 'font-mono text-brand-red')}>
        {value}
      </span>
    </div>
  );
}
