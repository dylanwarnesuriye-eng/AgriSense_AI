import React from 'react';

export type BadgeVariant =
  | 'status-live'
  | 'status-ready'
  | 'status-warning'
  | 'status-critical'
  | 'status-neutral'
  | 'academic-demo'
  | 'subsystem';

interface AgriBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const AgriBadge: React.FC<AgriBadgeProps> = ({
  children,
  variant = 'status-ready',
  pulse = false,
  className = '',
  icon,
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'status-live':
        return 'bg-brand-tint text-brand-primary border border-brand-tint-border rounded-full py-1 px-3 text-xs font-semibold';
      case 'status-ready':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full py-0.5 px-2.5 text-xs font-semibold';
      case 'status-warning':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full py-0.5 px-2.5 text-xs font-semibold';
      case 'status-critical':
        return 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full py-0.5 px-2.5 text-xs font-semibold';
      case 'status-neutral':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full py-0.5 px-2.5 text-xs font-medium';
      case 'academic-demo':
        return 'bg-surface text-content-primary border border-border-subtle rounded py-0.5 px-2 text-[11px] font-bold uppercase tracking-wider shadow-2xs';
      case 'subsystem':
        return 'bg-surface text-brand-primary border border-brand-primary/30 rounded py-0.5 px-2 text-xs font-semibold';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 leading-none shrink-0 ${getStyles()} ${className}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-secondary" />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
