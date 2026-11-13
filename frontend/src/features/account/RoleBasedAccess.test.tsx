import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from '../../components/layout/AppShell';
import { AccountSettingsView } from './AccountSettingsView';
import { SystemDiagnosticsView } from '../settings/SettingsView';

// Mock values for test users
let mockUser: {
  uid: string;
  email: string;
  displayName: string;
  role: 'farmer' | 'admin';
} | null = null;

let mockIsAdmin = false;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: mockUser?.role || 'farmer',
    isAdmin: mockIsAdmin,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../services/firebase', () => ({
  auth: { currentUser: null },
}));

describe('AgriSense AI — Role-Based Farmer & Admin Access (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Farmer Role Experience', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'farmer_user_01',
        email: 'farmer@agrisense.dev',
        displayName: 'John Farmer',
        role: 'farmer',
      };
      mockIsAdmin = false;
    });

    it('renders farmer sidebar without System Diagnostics or Admin section', () => {
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
          <div data-testid="test-content">Dashboard Content Area</div>
        </AppShell>
      );

      // Normal navigation visible
      expect(screen.getByText('Main Dashboard')).toBeTruthy();
      expect(screen.getByText('My Farms')).toBeTruthy();
      expect(screen.getByText('Two-Stage Assessment')).toBeTruthy();
      expect(screen.getByText('Account Settings')).toBeTruthy();

      // System Diagnostics and Admin section MUST NOT exist
      expect(screen.queryByText('System Diagnostics')).toBeNull();
      expect(screen.queryByText('ADMIN / SYSTEM')).toBeNull();

      // User profile card displays Farmer badge
      expect(screen.getByText('Farmer')).toBeTruthy();
      expect(screen.queryByText('Admin')).toBeNull();
    });

    it('blocks direct navigation to diagnostics and mounts AccountSettingsView instead', () => {
      const renderAppWithGate = (screenId: string, isAdmin: boolean) => {
        if (screenId === 'account') {
          return <AccountSettingsView />;
        }
        if (screenId === 'diagnostics' || screenId === 'settings') {
          return isAdmin ? (
            <SystemDiagnosticsView
              health={null}
              healthLoading={false}
              onRefreshHealth={vi.fn()}
            />
          ) : (
            <AccountSettingsView />
          );
        }
        return <div>Other</div>;
      };

      // Even if farmer state attempts to mount 'diagnostics'
      const { queryByTestId, getByTestId } = render(renderAppWithGate('diagnostics', false));

      expect(queryByTestId('system-diagnostics-view')).toBeNull();
      expect(getByTestId('account-settings-view')).toBeTruthy();
    });
  });

  describe('2. Admin Role Experience', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'admin_user_01',
        email: 'admin@agrisense.dev',
        displayName: 'Admin Sarah',
        role: 'admin',
      };
      mockIsAdmin = true;
    });

    it('renders admin sidebar with ADMIN / SYSTEM section and System Diagnostics', () => {
      render(
        <AppShell
          currentScreen="diagnostics"
          onNavigate={vi.fn()}
          farms={[]}
          selectedFarmId=""
          onSelectFarmId={vi.fn()}
          health={null}
          healthLoading={false}
          onRefreshHealth={vi.fn()}
          onOpenLogin={vi.fn()}
        >
          <div>Diagnostics Screen</div>
        </AppShell>
      );

      // Admin navigation section and items visible
      expect(screen.getByText('ADMIN / SYSTEM')).toBeTruthy();
      expect(screen.getByText('System Diagnostics')).toBeTruthy();
      expect(screen.getByText('ADMIN')).toBeTruthy();

      // User profile card displays Admin badge
      expect(screen.getByText('Admin')).toBeTruthy();
    });

    it('allows mounting SystemDiagnosticsView when isAdmin is true', () => {
      const renderAppWithGate = (screenId: string, isAdmin: boolean) => {
        if (screenId === 'diagnostics' || screenId === 'settings') {
          return isAdmin ? (
            <SystemDiagnosticsView
              health={null}
              healthLoading={false}
              onRefreshHealth={vi.fn()}
            />
          ) : (
            <AccountSettingsView />
          );
        }
        return <div>Other</div>;
      };

      const { getByTestId, queryByTestId } = render(renderAppWithGate('diagnostics', true));

      expect(getByTestId('system-diagnostics-view')).toBeTruthy();
      expect(queryByTestId('account-settings-view')).toBeNull();
      expect(screen.getByTestId('settings-auth-role').textContent).toBe('admin');
    });
  });
});
