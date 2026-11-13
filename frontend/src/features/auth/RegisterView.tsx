import React, { useState } from 'react';
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { formatAuthError } from './authErrors';

interface RegisterViewProps {
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const { registerWithEmail, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter a secure password.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    try {
      await registerWithEmail(trimmedEmail, password, trimmedName);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    }
  };

  return (
    <AgriCard
      className="w-full shadow-lg border-border"
      title={<span className="text-xl font-bold text-content-primary">Create Account</span>}
      subtitle="Join AgriSense AI for precision agronomic intelligence"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
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

        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-fullname"
            className="block text-xs font-semibold text-content-primary"
          >
            Full Name <span className="text-semantic-error">*</span>
          </label>
          <input
            id="register-fullname"
            data-testid="register-fullname-input"
            type="text"
            required
            autoComplete="name"
            placeholder="Dr. Samantha Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="w-full h-11 px-3.5 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-email"
            className="block text-xs font-semibold text-content-primary"
          >
            Email Address <span className="text-semantic-error">*</span>
          </label>
          <input
            id="register-email"
            data-testid="register-email-input"
            type="email"
            required
            autoComplete="email"
            placeholder="samantha@agrisense.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full h-11 px-3.5 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-password"
            className="block text-xs font-semibold text-content-primary"
          >
            Password <span className="text-semantic-error">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="register-password"
              data-testid="register-password-input"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-confirm-password"
            className="block text-xs font-semibold text-content-primary"
          >
            Confirm Password <span className="text-semantic-error">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="register-confirm-password"
              data-testid="register-confirm-password-input"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-3.5 pr-12 bg-surface border border-border-subtle rounded text-sm text-content-primary placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-50"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-1 w-10 h-10 flex items-center justify-center text-content-muted hover:text-content-primary transition-colors cursor-pointer focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <AgriButton
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          className="w-full mt-2"
          icon={<UserPlus className="w-4 h-4" />}
        >
          Create Account
        </AgriButton>

        {/* Switch to Login */}
        <div className="pt-2 text-center text-xs text-content-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-bold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </form>
    </AgriCard>
  );
};
