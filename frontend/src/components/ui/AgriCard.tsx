import React from 'react';

interface AgriCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const AgriCard: React.FC<AgriCardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  headerClassName = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-lg shadow-stitch-card transition-all ${
        hoverable ? 'hover:border-border-subtle hover:shadow-md cursor-pointer' : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className={`p-4 sm:p-5 border-b border-border flex items-center justify-between ${headerClassName}`}>
          <div>
            {title && (
              <h3 className="text-base font-semibold text-content-primary tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
};
