import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AgriButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const AgriButton: React.FC<AgriButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-active border border-transparent shadow-sm';
      case 'secondary':
        return 'bg-surface text-brand-primary border-1.5 border-brand-primary hover:bg-brand-tint active:bg-emerald-100';
      case 'outline':
        return 'bg-surface text-content-primary border border-border hover:border-border-subtle hover:bg-slate-50';
      case 'ghost':
        return 'bg-transparent text-content-primary hover:bg-slate-100 active:bg-slate-200 border border-transparent';
      case 'danger':
        return 'bg-semantic-error text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-sm';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3 text-xs min-w-[36px]';
      case 'md':
        return 'h-11 px-5 text-sm min-w-[44px]'; // Stitch standard 44px min-height
      case 'lg':
        return 'h-12 px-6 text-base min-w-[48px]';
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className="shrink-0 mr-2 flex items-center">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
