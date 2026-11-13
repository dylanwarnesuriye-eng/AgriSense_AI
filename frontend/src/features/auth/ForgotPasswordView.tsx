import React, { useState } from 'react';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriButton } from '../../components/ui/AgriButton';
import { formatAuthError } from './authErrors';

interface ForgotPasswordViewProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigateToLogin }) => {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      await resetPassword(trimmedEmail);
      setIsSuccess(true);
    } catch (err: unknown) {
      // For security, even on auth/user-not-found we don't expose account presence
      const msg = formatAuthError(err);
      if (msg === 'Incorrect email or password.') {
        setIsSuccess(true);
      } else {
        setError(msg);
      }
    }
  };

  return (
    <AgriCard
      className="w-full shadow-lg border-border"
      title={<span className="text-xl font-bold text-content-primary">Reset Password</span>}
      subtitle="Enter your email to receive password reset instructions"
    >
      <div className="space-y-4" data-testid="forgot-password-view">
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

        {/* Success Message Banner */}
        {isSuccess ? (
          <div
            data-testid="reset-success-alert"
            className="p-4 bg-brand-tint border border-brand-tint-border rounded text-xs text-brand-primary space-y-2 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-brand-secondary shrink-0" />
              <span>Reset Email Sent</span>
            </div>
            <p className="leading-relaxed">
              If an account exists for this email, password reset instructions have been sent. Please check your inbox and spam folder.
            </p>
            <div className="pt-2">
              <AgriButton
                type="button"
                variant="primary"
                size="md"
                className="w-full"
                onClick={onNavigateToLogin}
              >
                Return to Sign In
              </AgriButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-email"
                className="block text-xs font-semibold text-content-primary"
              >
                Email Address <span className="text-semantic-error">*</span>
              </label>
              <input
                id="forgot-email"
                data-testid="forgot-email-input"
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

            <AgriButton
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
              icon={<Mail className="w-4 h-4" />}
            >
              Send Reset Instructions
            </AgriButton>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-muted hover:text-brand-primary cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AgriCard>
  );
};
