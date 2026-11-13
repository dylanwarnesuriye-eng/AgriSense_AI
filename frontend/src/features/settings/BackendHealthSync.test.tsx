import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppShell } from '../../components/layout/AppShell';
import { SettingsView } from './SettingsView';
import { LoginModal } from '../auth/LoginModal';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { apiService, API_BASE } from '../../services/api';
import { isHealthOnline, useBackendHealth } from '../../hooks/useBackendHealth';
import { HealthStatus } from '../../types';

// Mock Firebase services to run cleanly in testing
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
}));

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    apiService: {
      ...actual.apiService,
      getHealth: vi.fn(),
      getFarms: vi.fn().mockResolvedValue({ data: [] }),
    },
  };
});

/**
 * Integrated Harness rendering AppShell (Global Header) and SettingsView together,
 * connected to the centralized useBackendHealth hook.
 */
const HealthIntegratedHarness: React.FC = () => {
  const { health, loading, isOnline, apiBase, refresh } = useBackendHealth(false);

  return (
    <AppShell
      currentScreen="settings"
      onNavigate={vi.fn()}
      farms={[]}
      selectedFarmId=""
      onSelectFarmId={vi.fn()}
      health={health}
      healthLoading={loading}
      isOnline={isOnline}
      onRefreshHealth={refresh}
      onOpenLogin={vi.fn()}
    >
      <SettingsView
        health={health}
        healthLoading={loading}
        isOnline={isOnline}
        apiBase={apiBase}
        onRefreshHealth={refresh}
      />
    </AppShell>
  );
};

describe('AgriSense AI Backend Health & Diagnostic State Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isHealthOnline predicate contract', () => {
    it('returns true only for healthy or ok statuses and false for all others', () => {
      expect(isHealthOnline({ status: 'healthy', environment: 'dev', version: '1', timestamp: '', modules: {} as any })).toBe(true);
      expect(isHealthOnline({ status: 'ok', environment: 'dev', version: '1', timestamp: '', modules: {} as any })).toBe(true);
      expect(isHealthOnline({ status: 'HEALTHY', environment: 'dev', version: '1', timestamp: '', modules: {} as any })).toBe(true);

      // Rejects degraded, error, offline, or null
      expect(isHealthOnline({ status: 'offline', environment: 'dev', version: '1', timestamp: '', modules: {} as any })).toBe(false);
      expect(isHealthOnline({ status: 'degraded', environment: 'dev', version: '1', timestamp: '', modules: {} as any })).toBe(false);
      expect(isHealthOnline(null)).toBe(false);
      expect(isHealthOnline(undefined as any)).toBe(false);
    });
  });

  describe('Global Header and Settings Diagnostic synchronization', () => {
    it('shows consistent Live / Online & Healthy state from real FastAPI health payload', async () => {
      const mockHealthyResponse: HealthStatus = {
        status: 'healthy',
        environment: 'staging-production',
        version: 'fastapi-0.1.0-prod',
        timestamp: '2026-10-05T12:00:00Z',
        modules: {
          crop_recommendation: 'ready',
          irrigation_advisory: 'ready',
          fertilizer_advisory: 'ready',
          yield_prediction: 'ready',
        },
      };

      (apiService.getHealth as any).mockResolvedValueOnce(mockHealthyResponse);

      render(
        <AuthProvider>
          <HealthIntegratedHarness />
        </AuthProvider>
      );

      // Trigger refresh via the Ping API button in Settings
      const pingBtn = screen.getByTestId('settings-ping-btn');
      await act(async () => {
        fireEvent.click(pingBtn);
      });

      await waitFor(() => {
        // Global header indicator check
        const globalText = screen.getByTestId('global-health-text');
        expect(globalText.textContent).toBe('Backend: Live');

        // Settings diagnostic API Status check
        const settingsStatus = screen.getByTestId('settings-api-status');
        expect(settingsStatus.textContent).toContain('Online & Healthy');

        // Settings diagnostic dynamic environment check
        const settingsEnv = screen.getByTestId('settings-api-environment');
        expect(settingsEnv.textContent?.toLowerCase()).toContain('staging-production');

        // Settings diagnostic API Base Route check
        const settingsBase = screen.getByTestId('settings-api-base');
        expect(settingsBase.textContent).toBe(API_BASE);

        // Settings diagnostic Version check
        const settingsVersion = screen.getByTestId('settings-api-version');
        expect(settingsVersion.textContent).toBe('fastapi-0.1.0-prod');
      });

      expect(apiService.getHealth).toHaveBeenCalledTimes(1);
    });

    it('shows consistent Offline state when FastAPI health endpoint is unreachable', async () => {
      (apiService.getHealth as any).mockRejectedValueOnce(new Error('Connection refused'));

      render(
        <AuthProvider>
          <HealthIntegratedHarness />
        </AuthProvider>
      );

      const pingBtn = screen.getByTestId('settings-ping-btn');
      await act(async () => {
        fireEvent.click(pingBtn);
      });

      await waitFor(() => {
        // Global header indicator check
        const globalText = screen.getByTestId('global-health-text');
        expect(globalText.textContent).toBe('Backend: Offline');

        // Settings diagnostic API Status check
        const settingsStatus = screen.getByTestId('settings-api-status');
        expect(settingsStatus.textContent).toContain('Offline / Unreachable');

        // Settings diagnostic Environment falls back gracefully
        const settingsEnv = screen.getByTestId('settings-api-environment');
        expect(settingsEnv.textContent).toBe('Unavailable');
      });
    });

    it('does not fake a Live status if FastAPI status is not healthy/ok', async () => {
      (apiService.getHealth as any).mockResolvedValueOnce({
        status: 'degraded',
        environment: 'maintenance',
        version: '1.0.0',
        timestamp: '',
        modules: {} as any,
      });

      render(
        <AuthProvider>
          <HealthIntegratedHarness />
        </AuthProvider>
      );

      const pingBtn = screen.getByTestId('settings-ping-btn');
      await act(async () => {
        fireEvent.click(pingBtn);
      });

      await waitFor(() => {
        // Both MUST show offline / unreachable rather than faking Live
        expect(screen.getByTestId('global-health-text').textContent).toBe('Backend: Offline');
        expect(screen.getByTestId('settings-api-status').textContent).toContain('Offline / Unreachable');
      });
    });

    it('shows loading indicator consistently during in-flight health requests', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (apiService.getHealth as any).mockReturnValueOnce(delayedPromise);

      render(
        <AuthProvider>
          <HealthIntegratedHarness />
        </AuthProvider>
      );

      const pingBtn = screen.getByTestId('settings-ping-btn');
      act(() => {
        fireEvent.click(pingBtn);
      });

      // While in flight:
      expect(screen.getByTestId('global-health-text').textContent).toBe('Connecting...');
      expect(screen.getByTestId('settings-api-status').textContent).toContain('Checking API...');

      // Resolve health response
      await act(async () => {
        resolvePromise!({
          status: 'healthy',
          environment: 'production',
          version: '0.1.0',
          timestamp: '',
          modules: {} as any,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('global-health-text').textContent).toBe('Backend: Live');
        expect(screen.getByTestId('settings-api-status').textContent).toContain('Online & Healthy');
      });
    });

    it('re-verifies health when global header badge is clicked', async () => {
      (apiService.getHealth as any).mockResolvedValueOnce({
        status: 'healthy',
        environment: 'production',
        version: '1.0.0',
        timestamp: '',
        modules: {} as any,
      });

      render(
        <AuthProvider>
          <HealthIntegratedHarness />
        </AuthProvider>
      );

      const globalBadge = screen.getByTestId('global-health-indicator');
      await act(async () => {
        fireEvent.click(globalBadge);
      });

      await waitFor(() => {
        expect(apiService.getHealth).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('global-health-text').textContent).toBe('Backend: Live');
        expect(screen.getByTestId('settings-api-status').textContent).toContain('Online & Healthy');
      });
    });
  });

  describe('Production Demo Identities & Profile Switching Protection', () => {
    it('disallows signInDemoUser when import.meta.env.PROD is simulated', () => {
      const origProd = import.meta.env.PROD;
      const origDev = import.meta.env.DEV;

      try {
        // Simulate production build flags
        (import.meta.env as any).PROD = true;
        (import.meta.env as any).DEV = false;

        const TestComp: React.FC = () => {
          const { signInDemoUser } = useAuth();
          return (
            <button
              data-testid="test-demo-login"
              onClick={() => {
                try {
                  signInDemoUser('lead_agronomist');
                } catch (e: any) {
                  const errorEl = document.createElement('div');
                  errorEl.setAttribute('data-testid', 'auth-error');
                  errorEl.textContent = e.message;
                  document.body.appendChild(errorEl);
                }
              }}
            >
              Test
            </button>
          );
        };

        render(
          <AuthProvider>
            <TestComp />
          </AuthProvider>
        );

        const btn = screen.getByTestId('test-demo-login');
        fireEvent.click(btn);

        const errorEl = screen.getByTestId('auth-error');
        expect(errorEl.textContent).toContain('strictly forbidden in production mode');
      } finally {
        (import.meta.env as any).PROD = origProd;
        (import.meta.env as any).DEV = origDev;
      }
    });

    it('does not render demo identities section in LoginModal under production mode', () => {
      const origProd = import.meta.env.PROD;
      const origDev = import.meta.env.DEV;

      try {
        (import.meta.env as any).PROD = true;
        (import.meta.env as any).DEV = false;

        render(
          <AuthProvider>
            <LoginModal isOpen={true} onClose={vi.fn()} />
          </AuthProvider>
        );

        expect(screen.queryByTestId('demo-identities-section')).toBeNull();
        expect(screen.queryByText(/Farmer John/i)).toBeNull();
        expect(screen.queryByText(/Dr\. Sarah/i)).toBeNull();
      } finally {
        (import.meta.env as any).PROD = origProd;
        (import.meta.env as any).DEV = origDev;
      }
    });
  });
});
