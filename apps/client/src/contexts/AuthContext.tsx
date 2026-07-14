import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import {
  hasPermission,
  type PermissionAction,
  type PermissionModule,
} from '../security/permissions';

export interface User {
  id: number;
  fullName: string;
  role: string;
  permissions: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const getTokenExpiry = (token: string): number | null => {
  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(paddedPayload));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser && (getTokenExpiry(savedToken) ?? 0) > Date.now()) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleExpiredAuth = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:expired', handleExpiredAuth);
    return () => window.removeEventListener('auth:expired', handleExpiredAuth);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiresAt = getTokenExpiry(token);
    const remaining = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
    const expiryTimer = window.setTimeout(logout, remaining);
    return () => window.clearTimeout(expiryTimer);
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;

    let idleTimer = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    };
    const activityEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'focus'];

    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer));
    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, [token, logout]);

  const can = (module: PermissionModule, action: PermissionAction) =>
    Boolean(user && hasPermission(user.role, user.permissions, module, action));

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
