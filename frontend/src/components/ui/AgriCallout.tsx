import React from 'react';
import { Info, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

export type CalloutType = 'advisory' | 'warning' | 'error' | 'simulation';

interface AgriCalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const AgriCallout: React.FC<AgriCalloutProps> = ({
  type = 'advisory',
  title,
  children,
  className = '',
}) => {
  const getCalloutStyles = () => {
    switch (type) {
      case 'advisory':
        return {
          container: 'border-l-4 border-l-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/40 text-[#1E40AF] dark:text-blue-300',
          icon: <Info className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />,
          titleColor: 'text-[#1E40AF] dark:text-blue-200',
        };
      case 'warning':
        return {
          container: 'border-l-4 border-l-[#D97706] bg-[#FFFBEB] dark:bg-amber-950/40 text-[#92400E] dark:text-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-amber-400 shrink-0 mt-0.5" />,
          titleColor: 'text-[#92400E] dark:text-amber-200',
        };
      case 'error':
        return {
          container: 'border-l-4 border-l-[#DC2626] bg-[#FEE2E2] dark:bg-red-950/40 text-[#B91C1C] dark:text-red-300',
          icon: <AlertCircle className="w-4 h-4 text-[#DC2626] dark:text-red-400 shrink-0 mt-0.5" />,
          titleColor: 'text-[#B91C1C] dark:text-red-200',
        };
      case 'simulation':
        return {
          container: 'border-l-4 border-l-[#166534] dark:border-l-emerald-500 bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#14532D] dark:text-emerald-300',
          icon: <Sparkles className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />,
          titleColor: 'text-[#14532D] dark:text-emerald-200',
        };
    }
  };

  const styles = getCalloutStyles();

  return (
    <div className={`p-4 rounded-r text-xs leading-relaxed flex items-start space-x-3 ${styles.container} ${className}`}>
      {styles.icon}
      <div className="flex-1 space-y-1">
        {title && <div className={`font-bold ${styles.titleColor}`}>{title}</div>}
        <div className="opacity-95">{children}</div>
      </div>
    </div>
  );
};
