import React, { useState } from 'react';
import { LogIn, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgriModal } from '../../components/ui/AgriModal';
import { AgriButton } from '../../components/ui/AgriButton';
import { AgriInput } from '../../components/ui/AgriInput';
import { AgriBadge } from '../../components/ui/AgriBadge';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, signInWithCredentials, logout, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithCredentials(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <AgriModal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Agronomist Account Session' : 'AgriSense AI Access'}
      subtitle="Firebase Authentication with strict Bearer token verification"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-semantic-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Display Name</span>
                <span className="font-bold text-content-primary">{user.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">User UID</span>
                <span className="font-mono text-content-primary text-[11px]">{user.uid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Email</span>
                <span className="text-content-primary">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Token Status</span>
                <AgriBadge variant={user.isMock ? 'status-warning' : 'status-live'}>
                  {user.isMock ? 'Local Dev Token' : 'Firebase Verified'}
                </AgriBadge>
              </div>
            </div>

            <AgriButton
              variant="danger"
              className="w-full"
              icon={<LogOut className="w-4 h-4" />}
              onClick={() => {
                logout();
                onClose();
              }}
            >
              Sign Out Session
            </AgriButton>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Live Firebase Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <AgriInput
                label="Email Address"
                type="email"
                placeholder="agronomist@farm.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <AgriInput
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <AgriButton
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
                icon={<LogIn className="w-4 h-4" />}
              >
                Sign In with Firebase
              </AgriButton>
            </form>
          </div>
        )}
      </div>
    </AgriModal>
  );
};
