import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/firebase', () => ({
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

const TestAuthConsumer: React.FC = () => {
  const { user, isAuthenticated, signInDemoUser } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</span>
      <span data-testid="user-uid">{user?.uid || 'no-user'}</span>
      <button data-testid="demo-login-btn" onClick={() => signInDemoUser('farmer_test_123')}>
        Demo Login
      </button>
    </div>
  );
};

describe('AuthContext - Task 4 Development Authentication Security', () => {
  it('allows demo login in development mode and sets mock user attributes', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    const loginBtn = screen.getByTestId('demo-login-btn');
    act(() => {
      loginBtn.click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-uid').textContent).toBe('farmer_test_123');
  });
});
