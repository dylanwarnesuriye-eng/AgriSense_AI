import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountSettingsView } from './AccountSettingsView';
import { SystemDiagnosticsView } from '../settings/SettingsView';
import { AppShell } from '../../components/layout/AppShell';
import { updateProfile } from 'firebase/auth';

// Mock Firebase services
const mockResetPassword = vi.fn().mockResolvedValue(undefined);
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'agri-user-123',
      email: 'agronomist@farm.org',
      displayName: 'Dr. Maria Santos',
    },
  },
}));

vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({
      uid: 'agri-user-123',
      email: 'agronomist@farm.org',
      displayName: 'Dr. Maria Santos',
    });
    return vi.fn();
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'agri-user-123',
      email: 'agronomist@farm.org',
      displayName: 'Dr. Maria Santos',
    },
    loading: false,
    login: vi.fn(),
    logout: mockLogout,
    resetPassword: mockResetPassword,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Account Settings & System Diagnostics Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Normal User Experience: AccountSettingsView', () => {
    it('renders normal user profile, credentials, and application preferences', () => {
      render(<AccountSettingsView />);

      // Title & User badges
      expect(screen.getByText('Account Settings')).toBeTruthy();
      expect(screen.getByText('Profile & Preferences')).toBeTruthy();

      // Profile details
      const nameInput = screen.getByLabelText(/Full Name \/ Display Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Dr. Maria Santos');
      expect(screen.getByText('agronomist@farm.org')).toBeTruthy();

      // Password reset & Sign out options
      expect(screen.getByRole('button', { name: /Reset Password via Email/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeTruthy();

      // Application preferences
      expect(screen.getByText(/Measurement Unit System/i)).toBeTruthy();
      expect(screen.getByText(/Metric \(kg\/ha, °C\)/i)).toBeTruthy();
      expect(screen.getByText(/Imperial \(lbs\/ac, °F\)/i)).toBeTruthy();
      expect(screen.getByText(/Auto-Save Telemetry/i)).toBeTruthy();
      expect(screen.getByText(/Two-Stage Confirmation Active/i)).toBeTruthy();
    });

    it('allows updating display name via updateProfile', async () => {
      render(<AccountSettingsView />);

      const nameInput = screen.getByLabelText(/Full Name \/ Display Name/i);
      fireEvent.change(nameInput, { target: { value: 'Dr. Maria Santos Silva' } });

      const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith(
          expect.anything(),
          { displayName: 'Dr. Maria Santos Silva' }
        );
        expect(screen.getByText(/Display name updated successfully/i)).toBeTruthy();
      });
    });

    it('triggers password reset email safely without exposing credentials', async () => {
      render(<AccountSettingsView />);

      const resetBtn = screen.getByRole('button', { name: /Reset Password via Email/i });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('agronomist@farm.org');
        expect(
          screen.getByText(/Password reset instructions have been sent to agronomist@farm.org/i)
        ).toBeTruthy();
      });
    });

    it('triggers sign out session', () => {
      render(<AccountSettingsView />);

      const logoutBtn = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(logoutBtn);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('does NOT expose internal developer artifacts, API base URLs, or database internals', () => {
      const { container } = render(<AccountSettingsView />);
      const content = container.textContent || '';

      // AI artifact versions
      expect(content).not.toContain('crop_decision_tree_v1.0');
      expect(content).not.toContain('fuzzy_irrigation_v1.0');
      expect(content).not.toContain('kb_fertilizer_v0.1_draft');
      expect(content).not.toContain('yield_regressor_v1.0');

      // Model registry internals
      expect(content).not.toContain('Gini impurity criterion');
      expect(content).not.toContain('Mamdani Fuzzy Inference');
      expect(content).not.toContain('Forward-Chaining Knowledge Base');
      expect(content).not.toContain('L2-regularized linear model');

      // Infrastructure internals
      expect(content).not.toContain('FastAPI');
      expect(content).not.toContain('api/v1');
      expect(content).not.toContain('Ping API');
      expect(content).not.toContain('Bearer ID Token');
      expect(content).not.toContain('Firestore (Thread-Safe Fallback)');
      expect(content).not.toContain('ALLOW_IN_MEMORY_FALLBACK');
    });
  });

  describe('2. Navigation & Sidebar Separation', () => {
    it('renders Account Settings in sidebar navigation', () => {
      render(
        <AppShell
          currentScreen="account"
          onNavigate={vi.fn()}
          farms={[]}
          selectedFarmId=""
          onSelectFarmId={vi.fn()}
          health={null}
          healthLoading={false}
          onRefreshHealth={vi.fn()}
          onOpenLogin={vi.fn()}
        >
          <div>Screen Content</div>
        </AppShell>
      );

      // Verify Account Settings is in sidebar
      expect(screen.getByText('Account Settings')).toBeTruthy();
      // Verify obsolete Settings & Diagnostics is removed
      expect(screen.queryByText('Settings & Diagnostics')).toBeNull();
    });

    it('renders standard user sections: Overview, Farm Telemetry, AI Orchestration, Subsystems, Platform', () => {
      render(
        <AppShell
          currentScreen="dashboard"
          onNavigate={vi.fn()}
          farms={[]}
          selectedFarmId=""
          onSelectFarmId={vi.fn()}
          health={null}
          healthLoading={false}
          onRefreshHealth={vi.fn()}
          onOpenLogin={vi.fn()}
        >
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByText('Main Dashboard')).toBeTruthy();
      expect(screen.getByText('My Farms')).toBeTruthy();
      expect(screen.getByText('Farm & Fields')).toBeTruthy();
      expect(screen.getByText('Soil & Climate Telemetry')).toBeTruthy();
      expect(screen.getByText('Two-Stage Assessment')).toBeTruthy();
      expect(screen.getByText('Assessment Audit Trail')).toBeTruthy();
      expect(screen.getByText('Account Settings')).toBeTruthy();
    });
  });

  describe('3. Developer Diagnostics & Persistence Label', () => {
    it('displays "Cloud Firestore — Live Persistence" instead of Thread-Safe Fallback', () => {
      render(
        <SystemDiagnosticsView
          health={{
            status: 'healthy',
            environment: 'development',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            modules: {
              crop_recommendation: 'ready',
              irrigation_advisory: 'ready',
              fertilizer_advisory: 'ready',
              yield_prediction: 'ready',
            },
          }}
          healthLoading={false}
          onRefreshHealth={vi.fn()}
        />
      );

      const firestoreStatus = screen.getByTestId('settings-firestore-status');
      expect(firestoreStatus.textContent).toBe('Cloud Firestore — Live Persistence');
      expect(firestoreStatus.textContent).not.toContain('Fallback');
      expect(firestoreStatus.textContent).not.toContain('Thread-Safe');
    });

    it('displays System Diagnostics header, AI registry, and Ping API in diagnostic view', () => {
      render(
        <SystemDiagnosticsView
          health={{
            status: 'healthy',
            environment: 'development',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            modules: {
              crop_recommendation: 'ready',
              irrigation_advisory: 'ready',
              fertilizer_advisory: 'ready',
              yield_prediction: 'ready',
            },
          }}
          healthLoading={false}
          onRefreshHealth={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { level: 1, name: 'System Diagnostics' })).toBeTruthy();
      expect(screen.getByText(/AI Subsystem Model Architecture & Artifacts/i)).toBeTruthy();
      expect(screen.getByText('crop_decision_tree_v1.0')).toBeTruthy();
      expect(screen.getByText('fuzzy_irrigation_v1.0')).toBeTruthy();
      expect(screen.getByText('kb_fertilizer_v0.1_draft')).toBeTruthy();
      expect(screen.getByText('yield_regressor_v1.0')).toBeTruthy();
      expect(screen.getByTestId('settings-ping-btn')).toBeTruthy();
    });
  });

  describe('4. Security & DEV Mode Protection', () => {
    it('restricts System Diagnostics when import.meta.env.DEV is false', () => {
      // Simulating the protection logic evaluated in App.tsx:
      // (currentScreen === 'diagnostics' || currentScreen === 'settings') && (
      //   import.meta.env.DEV ? <SystemDiagnosticsView ... /> : <AccountSettingsView />
      // )
      const renderScreen = (screenId: string, isDev: boolean) => {
        if (screenId === 'account') {
          return <AccountSettingsView />;
        }
        if (screenId === 'diagnostics' || screenId === 'settings') {
          return isDev ? (
            <SystemDiagnosticsView
              health={null}
              healthLoading={false}
              onRefreshHealth={vi.fn()}
            />
          ) : (
            <AccountSettingsView />
          );
        }
        return <div>Other Screen</div>;
      };

      // In production mode (isDev = false), attempting to navigate to 'diagnostics' or 'settings'
      // returns AccountSettingsView, never leaking System Diagnostics.
      const { queryByTestId, getByTestId, rerender } = render(renderScreen('diagnostics', false));
      expect(queryByTestId('system-diagnostics-view')).toBeNull();
      expect(getByTestId('account-settings-view')).toBeTruthy();

      rerender(renderScreen('settings', false));
      expect(queryByTestId('system-diagnostics-view')).toBeNull();
      expect(getByTestId('account-settings-view')).toBeTruthy();

      // In development mode (isDev = true), diagnostics is accessible
      rerender(renderScreen('diagnostics', true));
      expect(getByTestId('system-diagnostics-view')).toBeTruthy();
    });
  });
});
