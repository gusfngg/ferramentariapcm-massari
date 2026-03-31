'use client';

import clsx from 'clsx';

type InputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  type?: string;
  inputMode?: InputMode;
  placeholder?: string;
};

export default function FormField({
  label,
  value,
  onChange,
  mono = false,
  type = 'text',
  inputMode,
  placeholder,
}: FormFieldProps) {
  return (
    <div>
      <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className={clsx(
          'w-full border-2 border-brand-gray-border bg-white px-3 py-2.5 text-sm transition-colors focus:border-brand-red focus:outline-none',
          mono && 'font-mono'
        )}
      />
    </div>
  );
}
