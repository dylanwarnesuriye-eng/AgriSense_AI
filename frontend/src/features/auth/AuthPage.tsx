import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import { ForgotPasswordView } from './ForgotPasswordView';

export type AuthMode = 'login' | 'register' | 'forgot-password';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <div
      data-testid="auth-page"
      className="min-h-screen bg-canvas text-content-primary flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 antialiased selection:bg-brand-primary selection:text-white relative"
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center space-x-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        {/* AgriSense AI Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md">
            <Sprout className="w-7 h-7 text-brand-secondary" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              AgriSense AI
            </h1>
            <p className="text-xs font-medium text-content-muted">
              Precision Agronomic Intelligence Platform
            </p>
          </div>
        </div>

        {/* Auth Mode View Switcher */}
        <div className="w-full">
          {mode === 'login' && (
            <LoginView
              onNavigateToRegister={() => setMode('register')}
              onNavigateToForgotPassword={() => setMode('forgot-password')}
            />
          )}

          {mode === 'register' && (
            <RegisterView onNavigateToLogin={() => setMode('login')} />
          )}

          {mode === 'forgot-password' && (
            <ForgotPasswordView onNavigateToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-content-muted space-y-1">
          <p>&copy; {new Date().getFullYear()} AgriSense AI. All rights reserved.</p>
          <p className="text-[10px] text-content-muted/80">
            Protected by Google Cloud Firebase Authentication &amp; Firestore
          </p>
        </div>
      </div>
    </div>
  );
};
