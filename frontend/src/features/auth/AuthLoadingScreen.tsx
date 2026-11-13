import React from 'react';
import { Sprout } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      data-testid="auth-loading-screen"
      className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 antialiased selection:bg-brand-primary selection:text-white"
    >
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-4">
        {/* AgriSense AI Brand Logo */}
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md">
            <Sprout className="w-8 h-8 text-brand-secondary animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-brand-primary/10 -z-10 animate-ping" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            AgriSense AI
          </h1>
          <p className="text-xs text-content-muted">
            Precision Agronomic Intelligence Platform
          </p>
        </div>

        {/* Loading Spinner Indicator */}
        <div className="pt-2 flex flex-col items-center space-y-2.5">
          <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-xs font-semibold text-content-muted animate-pulse">
            Initializing secure session...
          </p>
        </div>
      </div>
    </div>
  );
};
