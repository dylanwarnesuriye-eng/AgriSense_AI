import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Lock,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { auth } from '../../services/firebase';
import { updateProfile } from 'firebase/auth';
import { AgriCard } from '../../components/ui/AgriCard';
import { AgriBadge } from '../../components/ui/AgriBadge';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriInput } from '../../components/ui/AgriInput';
import { LanguageSelector } from '../../components/ui/LanguageSelector';

export const AccountSettingsView: React.FC = () => {
  const { user, resetPassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isResettingPass, setIsResettingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Preference toggles
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [autoSaveTelemetry, setAutoSaveTelemetry] = useState(true);

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !displayName.trim()) return;

    setIsUpdatingName(true);
    setNameSuccess(null);
    setNameError(null);

    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setNameSuccess('Display name updated successfully.');
    } catch {
      setNameError('Could not update display name. Please try again later.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;

    setIsResettingPass(true);
    setPassSuccess(null);
    setPassError(null);

    try {
      await resetPassword(user.email);
      setPassSuccess(`Password reset instructions have been sent to ${user.email}.`);
    } catch {
      setPassError('Failed to send reset email. Please try again later.');
    } finally {
      setIsResettingPass(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="account-settings-view">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <AgriBadge variant="status-live">User Session</AgriBadge>
          <AgriBadge variant="status-ready">Profile &amp; Preferences</AgriBadge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-content-primary tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-content-muted mt-0.5">
          Manage your agronomist profile, authentication security credentials, and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile & Security (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Card */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                <span>Profile Information</span>
              </div>
            }
            subtitle="Your personal identification across farm records and assessment audit trails"
          >
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              {nameSuccess && (
                <div className="p-3 bg-brand-tint border border-brand-tint-border rounded text-xs text-brand-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-secondary" />
                  <span>{nameSuccess}</span>
                </div>
              )}
              {nameError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{nameError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <AgriInput
                    id="account-display-name"
                    label="Full Name / Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Dr. Samantha Silva"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-content-primary mb-1.5">
                    Email Address
                  </label>
                  <div className="h-11 px-3.5 bg-slate-50 border border-border rounded text-sm text-content-muted flex items-center gap-2">
                    <Mail className="w-4 h-4 text-content-muted shrink-0" />
                    <span className="truncate">{user?.email || 'No email registered'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-content-muted">
                  Account Role:{' '}
                  <strong className={user?.role === 'admin' ? 'text-amber-800 font-bold' : 'text-brand-primary'}>
                    {user?.role === 'admin' ? 'Administrator' : 'Farmer (Verified)'}
                  </strong>
                </span>
                <AgriButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isUpdatingName}
                >
                  Save Profile Changes
                </AgriButton>
              </div>
            </form>
          </AgriCard>

          {/* Security & Authentication */}
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Password &amp; Security</span>
              </div>
            }
            subtitle="Manage your authentication credentials and active sessions"
          >
            <div className="space-y-4 text-xs">
              {passSuccess && (
                <div className="p-3 bg-brand-tint border border-brand-tint-border rounded text-xs text-brand-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-secondary" />
                  <span>{passSuccess}</span>
                </div>
              )}
              {passError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-semantic-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-content-primary text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-content-muted" />
                    Account Password
                  </span>
                  <p className="text-content-muted text-xs">
                    Protected by secure cloud identity infrastructure. Passwords are never stored locally.
                  </p>
                </div>
                <AgriButton
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={isResettingPass}
                  onClick={handleSendPasswordReset}
                  className="shrink-0"
                >
                  Reset Password via Email
                </AgriButton>
              </div>

              <div className="p-4 border border-red-100 bg-red-50/50 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-content-primary text-sm">Sign Out Session</span>
                  <p className="text-content-muted text-xs">
                    End your active session on this device and return to the secure sign-in portal.
                  </p>
                </div>
                <AgriButton
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={<LogOut className="w-4 h-4" />}
                  onClick={logout}
                  className="shrink-0"
                >
                  Sign Out
                </AgriButton>
              </div>
            </div>
          </AgriCard>
        </div>

        {/* Right Column: Agronomic & UI Preferences (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <AgriCard
            title={
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-primary" />
                <span>Application Preferences</span>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-content-primary block">
                  Measurement Unit System
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnitSystem('metric')}
                    className={`h-9 px-3 rounded text-xs font-semibold border transition-all cursor-pointer ${
                      unitSystem === 'metric'
                        ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                        : 'bg-surface text-content-muted border-border hover:bg-slate-50'
                    }`}
                  >
                    Metric (kg/ha, °C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem('imperial')}
                    className={`h-9 px-3 rounded text-xs font-semibold border transition-all cursor-pointer ${
                      unitSystem === 'imperial'
                        ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                        : 'bg-surface text-content-muted border-border hover:bg-slate-50'
                    }`}
                  >
                    Imperial (lbs/ac, °F)
                  </button>
                </div>
                <p className="text-[11px] text-content-muted mt-1">
                  Default: Metric (calibrated for agricultural soil chemistry and rainfall telemetry).
                </p>
              </div>

              {/* Theme Selection */}
              <div className="space-y-1.5 pt-3 border-t border-border">
                <label className="font-semibold text-content-primary block">
                  Interface Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`h-9 px-2 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === 'light'
                        ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                        : 'bg-surface text-content-muted border-border hover:bg-slate-50'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`h-9 px-2 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === 'dark'
                        ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                        : 'bg-surface text-content-muted border-border hover:bg-slate-50'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`h-9 px-2 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      theme === 'system'
                        ? 'bg-brand-tint text-brand-primary border-brand-primary font-bold shadow-2xs'
                        : 'bg-surface text-content-muted border-border hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>System</span>
                  </button>
                </div>
                <p className="text-[11px] text-content-muted mt-1">
                  Sync with your device appearance or choose light / dark mode.
                </p>
              </div>

              {/* Language Selection */}
              <div className="space-y-1.5 pt-3 border-t border-border">
                <label className="font-semibold text-content-primary block">
                  {t('languageLabel')}
                </label>
                <LanguageSelector variant="segmented" />
                <p className="text-[11px] text-content-muted mt-1">
                  {t('languageDesc')}
                </p>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-content-primary">
                    Auto-Save Telemetry
                  </span>
                  <input
                    type="checkbox"
                    checked={autoSaveTelemetry}
                    onChange={(e) => setAutoSaveTelemetry(e.target.checked)}
                    className="w-4 h-4 text-brand-primary rounded border-border-subtle focus:ring-brand-primary cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-content-muted">
                  Automatically syncs field sensor readings directly to your farm records.
                </p>
              </div>

              <div className="pt-3 border-t border-border space-y-1.5">
                <span className="font-semibold text-content-primary block">
                  Decision Support Invariant
                </span>
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded text-[11px] text-emerald-900 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-secondary" />
                    Two-Stage Confirmation Active
                  </div>
                  Farmer confirmation is always required before agronomic advisories or yield forecasts are locked.
                </div>
              </div>
            </div>
          </AgriCard>
        </div>
      </div>
    </div>
  );
};
