import React from 'react';

interface AgriInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  unit?: string;
  error?: string;
  required?: boolean;
}

export const AgriInput: React.FC<AgriInputProps> = ({
  label,
  helperText,
  unit,
  error,
  required,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-content-primary">
          {label}
          {required && <span className="text-semantic-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative rounded flex items-center">
        <input
          id={inputId}
          className={`w-full h-11 px-3.5 bg-surface border ${
            error ? 'border-semantic-error ring-1 ring-semantic-error' : 'border-border-subtle'
          } rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all ${
            unit ? 'pr-14 tabular-nums' : ''
          } ${className}`}
          {...props}
        />
        {unit && (
          <div className="absolute right-3 text-xs font-semibold text-content-muted pointer-events-none uppercase">
            {unit}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-semantic-error mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-content-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
