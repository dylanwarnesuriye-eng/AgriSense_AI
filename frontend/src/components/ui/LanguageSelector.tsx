import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Language } from '../../i18n/translations';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'segmented';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  if (variant === 'segmented') {
    const options: { code: Language; label: string; nativeName: string }[] = [
      { code: 'en', label: 'English', nativeName: 'English' },
      { code: 'si', label: 'Sinhala', nativeName: 'සිංහල' },
    ];

    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              aria-label={`Select ${opt.label} language`}
              className={`h-9 px-3 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                  : 'bg-surface text-content-muted border-border hover:bg-slate-50'
              }`}
            >
              <span>{opt.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact header toggle button
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${language === 'en' ? 'Sinhala' : 'English'}`}
      title={language === 'en' ? 'සිංහල භාෂාවට මාරු වන්න' : 'Switch to English'}
      className={`h-9 px-3 rounded-full flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-100 transition-colors cursor-pointer text-xs font-bold ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-brand-primary dark:text-brand-secondary shrink-0" />
      <span className="uppercase tracking-wider text-[11px] font-extrabold text-slate-800 dark:text-slate-100">
        {language === 'en' ? 'EN' : 'සිං'}
      </span>
    </button>
  );
};
