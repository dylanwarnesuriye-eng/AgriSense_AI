import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { formatAuthError } from './authErrors';

interface LoginViewProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const { signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    }
  };

  return (
    <AgriCard
      className="w-full shadow-lg border-border"
      title={<span className="text-xl font-bold text-content-primary">Welcome Back</span>}
      subtitle="Sign in to continue to AgriSense AI"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
        {/* Error Alert Box */}
        {error && (
          <div
            data-testid="auth-error-alert"
            className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-content-primary"
          >
            Email Address <span className="text-semantic-error">*</span>
          </label>
          <input
            id="login-email"
            data-testid="login-email-input"
            type="email"
            required
            autoComplete="email"
            placeholder="agronomist@farm.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full h-11 px-3.5 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
          />
        </div>

        {/* Password Field with Show/Hide Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-content-primary"
            >
              Password <span className="text-semantic-error">*</span>
            </label>
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="login-password"
              data-testid="login-password-input"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-3.5 pr-12 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 w-10 h-10 flex items-center justify-center text-content-muted hover:text-content-primary transition-colors cursor-pointer focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sign In Submit Button */}
        <AgriButton
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          className="w-full mt-2"
          icon={<LogIn className="w-4 h-4" />}
        >
          Sign In
        </AgriButton>

        {/* Switch to Register */}
        <div className="pt-2 text-center text-xs text-content-muted">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="font-bold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
          >
            Create account
          </button>
        </div>
      </form>
    </AgriCard>
  );
};
