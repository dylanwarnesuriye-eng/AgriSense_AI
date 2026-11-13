import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { AuthPage } from './AuthPage';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { apiService } from '../../services/api';
import * as authService from '../../services/firebase';

// Mock Firebase functions
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSignOut = vi.fn();
let authStateCallback: ((user: any) => void) | null = null;

vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (_auth: any, callback: (user: any) => void) => {
    authStateCallback = callback;
    return vi.fn();
  },
}));

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    apiService: {
      ...actual.apiService,
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
      getFarms: vi.fn().mockResolvedValue({ data: [] }),
    },
  };
});

describe('AgriSense AI — Authentication & Protected Access Test Suite (Task 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    (authService.auth as any).currentUser = null;
    localStorage.clear();
  });

  // 1. Auth loading state hides dashboard
  it('1. shows dedicated loading screen and hides dashboard while auth state is resolving', () => {
    render(<App />);
    expect(screen.getByTestId('auth-loading-screen')).toBeDefined();
    expect(screen.getByText(/initializing secure session/i)).toBeDefined();
    expect(screen.queryByText(/main dashboard/i)).toBeNull();
  });

  // 2. Logged-out user sees Login
  it('2. renders Login view once auth resolves to unauthenticated', async () => {
    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeDefined();
      expect(screen.getByText('Welcome Back')).toBeDefined();
      expect(screen.getByTestId('login-email-input')).toBeDefined();
    });
  });

  // 3. Dashboard is not rendered while logged out
  it('3. does NOT render dashboard, AppShell, or sidebar when user is logged out', async () => {
    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('global-header-title')).toBeNull();
      expect(screen.queryByText('Active Farm Context')).toBeNull();
      expect(screen.queryByText('Overview')).toBeNull();
    });
  });

  // 4. Login -> Register navigation works
  it('4. navigates smoothly from Login to Register', async () => {
    render(
      <AuthProvider>
        <AuthPage initialMode="login" />
      </AuthProvider>
    );

    const createAccountBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(createAccountBtn);

    expect(screen.getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/join agrisense ai for precision agronomic intelligence/i)).toBeDefined();
    expect(screen.getByTestId('register-fullname-input')).toBeDefined();
  });

  // 5. Register -> Login navigation works
  it('5. navigates smoothly from Register back to Login', async () => {
    render(
      <AuthProvider>
        <AuthPage initialMode="register" />
      </AuthProvider>
    );

    const signInBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInBtn);

    expect(screen.getByText('Welcome Back')).toBeDefined();
  });

  // 6. Password mismatch blocks registration
  it('6. blocks registration and displays friendly error on password mismatch', async () => {
    render(
      <AuthProvider>
        <RegisterView onNavigateToLogin={vi.fn()} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId('register-fullname-input'), { target: { value: 'Dr. Jane Silva' } });
    fireEvent.change(screen.getByTestId('register-email-input'), { target: { value: 'jane@agrisense.dev' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'mismatch456' } });

    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error-alert')).toBeDefined();
      expect(screen.getByText(/passwords do not match/i)).toBeDefined();
    });

    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  // 7. Invalid email shows friendly error
  it('7. displays friendly error on invalid email format', async () => {
    render(
      <AuthProvider>
        <RegisterView onNavigateToLogin={vi.fn()} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId('register-fullname-input'), { target: { value: 'Dr. Jane Silva' } });
    fireEvent.change(screen.getByTestId('register-email-input'), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'password123' } });

    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error-alert')).toBeDefined();
      expect(screen.getByText(/please enter a valid email address/i)).toBeDefined();
    });
  });

  // 8. Successful login enters application
  it('8. enters the application upon successful login', async () => {
    const mockUser = {
      uid: 'user_123',
      email: 'agronomist@agrisense.dev',
      displayName: 'Senior Agronomist',
      getIdToken: vi.fn().mockResolvedValue('firebase-valid-token-123'),
    };
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'agronomist@agrisense.dev' },
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'SecurePass123!' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'));
    });

    // Simulating Firebase triggering onAuthStateChanged upon sign in
    act(() => {
      if (authStateCallback) authStateCallback(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText('Main Dashboard')).toBeDefined();
      expect(screen.queryByTestId('auth-page')).toBeNull();
    });
  });

  // 9. Successful registration enters application
  it('9. registers user with full name, updates Firebase profile, and enters application', async () => {
    const mockCreatedUser = {
      uid: 'new_user_456',
      email: 'newfarmer@agrisense.dev',
      displayName: 'New Farmer',
      getIdToken: vi.fn().mockResolvedValue('firebase-valid-token-456'),
    };
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockCreatedUser });
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeDefined();
    });

    // Navigate to register
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    fireEvent.change(screen.getByTestId('register-fullname-input'), { target: { value: 'New Farmer' } });
    fireEvent.change(screen.getByTestId('register-email-input'), { target: { value: 'newfarmer@agrisense.dev' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'SecretPassword99!' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'SecretPassword99!' } });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('register-form'));
    });

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'newfarmer@agrisense.dev',
      'SecretPassword99!'
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(mockCreatedUser, { displayName: 'New Farmer' });

    // Firebase state listener fires
    act(() => {
      if (authStateCallback) authStateCallback(mockCreatedUser);
    });

    await waitFor(() => {
      expect(screen.getByText('Main Dashboard')).toBeDefined();
    });
  });

  // 10. Page refresh / session restoration preserves login
  it('10. restores existing session on refresh without flashing unauthenticated state', async () => {
    const existingUser = {
      uid: 'user_active_789',
      email: 'active@agrisense.dev',
      displayName: 'Active Agronomist',
      getIdToken: vi.fn().mockResolvedValue('fresh-session-token'),
    };

    render(<App />);

    // Session immediately resolves as authenticated (simulating page reload with active session)
    act(() => {
      if (authStateCallback) authStateCallback(existingUser);
    });

    await waitFor(() => {
      expect(screen.getByText('Main Dashboard')).toBeDefined();
      expect(screen.queryByTestId('auth-page')).toBeNull();
    });
  });

  // 11. Logout returns to Login
  it('11. returns to Login view and clears protected state upon logout', async () => {
    const activeUser = {
      uid: 'user_active_789',
      email: 'active@agrisense.dev',
      displayName: 'Active Agronomist',
      getIdToken: vi.fn().mockResolvedValue('fresh-session-token'),
    };

    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(activeUser);
    });

    await waitFor(() => {
      expect(screen.getByText('Main Dashboard')).toBeDefined();
    });

    // Trigger logout
    const signOutBtn = screen.getByTitle('Sign out');
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    // Firebase reports auth state is null
    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeDefined();
      expect(screen.queryByText('Main Dashboard')).toBeNull();
    });
  });

  // 12. Forgot password calls Firebase reset function
  it('12. calls sendPasswordResetEmail and shows neutral success message', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <ForgotPasswordView onNavigateToLogin={vi.fn()} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByTestId('forgot-email-input'), {
      target: { value: 'reset.target@agrisense.dev' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('forgot-password-form'));
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'reset.target@agrisense.dev'
    );

    await waitFor(() => {
      expect(screen.getByTestId('reset-success-alert')).toBeDefined();
      expect(
        screen.getByText(/if an account exists for this email, password reset instructions have been sent/i)
      ).toBeDefined();
    });
  });

  // 13. Protected application screens are not mounted while logged out
  it('13. ensures protected screens like Telemetry, Advisory, and Settings are NOT mounted when logged out', async () => {
    render(<App />);

    act(() => {
      if (authStateCallback) authStateCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeDefined();
    });

    expect(screen.queryByText('Soil & Climate Telemetry')).toBeNull();
    expect(screen.queryByText('Two-Stage Assessment')).toBeNull();
    expect(screen.queryByText('Irrigation Advisory')).toBeNull();
    expect(screen.queryByText('Fertilizer Advisory')).toBeNull();
    expect(screen.queryByText('Yield Prediction')).toBeNull();
    expect(screen.queryByText('Settings & Diagnostics')).toBeNull();
  });

  // 14. API requests dynamically obtain Firebase ID token
  it('14. verifies apiService requests attach the active Firebase ID token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy', data: { farm_id: 'frm_123' } }),
    } as any);

    (authService.auth as any).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('bearer-firebase-id-token-abc'),
    };

    await apiService.getFarm('frm_123');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/farms/frm_123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer-firebase-id-token-abc',
        }),
      })
    );
  });

  // 15. Demo auth controls and DEV ONLY section are completely absent
  it('15. verifies demo identities section and DEV ONLY badges are completely absent', () => {
    render(
      <AuthProvider>
        <LoginView onNavigateToRegister={vi.fn()} onNavigateToForgotPassword={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.queryByTestId('demo-identities-section')).toBeNull();
    expect(screen.queryByText(/Development Test Identities/i)).toBeNull();
    expect(screen.queryByText(/DEV ONLY/i)).toBeNull();
    expect(screen.queryByText(/Farmer John/i)).toBeNull();
    expect(screen.queryByText(/Dr\. Sarah/i)).toBeNull();
  });
});
