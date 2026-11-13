import React from 'react';

interface AgriSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export const AgriSelect: React.FC<AgriSelectProps> = ({
  label,
  helperText,
  error,
  required,
  options,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-content-primary">
          {label}
          {required && <span className="text-semantic-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative rounded">
        <select
          id={selectId}
          className={`w-full h-11 px-3.5 bg-surface border ${
            error ? 'border-semantic-error ring-1 ring-semantic-error' : 'border-border-subtle'
          } rounded text-sm text-content-primary focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all cursor-pointer ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </div>
      {error ? (
        <p className="text-xs text-semantic-error mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-content-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
