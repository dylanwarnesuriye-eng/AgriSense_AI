import { useState, useEffect, useCallback } from 'react';
import { HealthStatus } from '../types';
import { apiService, API_BASE } from '../services/api';

export interface BackendHealthState {
  health: HealthStatus | null;
  loading: boolean;
  isOnline: boolean;
  error: string | null;
  apiBase: string;
  refresh: () => Promise<void>;
}

/**
 * Standardized predicate to determine if the FastAPI backend is online and healthy.
 * FastAPI returns { status: "healthy", ... }.
 * Also supports "ok" for defensive compatibility.
 * Rejects null, undefined, offline, error, degraded, or falsy statuses.
 */
export function isHealthOnline(health: HealthStatus | null): boolean {
  if (!health || typeof health !== 'object') return false;
  const status = health.status?.toLowerCase();
  return status === 'healthy' || status === 'ok';
}

/**
 * Centralized backend health hook.
 * Connects to the real FastAPI /api/v1/health endpoint.
 * Preserves loading, online, and offline states without faking live status.
 */
export function useBackendHealth(autoFetch = true): BackendHealthState {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getHealth();
      setHealth(data);
    } catch (err: any) {
      setHealth(null);
      setError(err?.message || 'Failed to connect to FastAPI backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  const isOnline = isHealthOnline(health);

  return {
    health,
    loading,
    isOnline,
    error,
    apiBase: API_BASE,
    refresh,
  };
}
