import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  permissions: string[];
  roles: { id: string; name: string }[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, schoolId?: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (perm: string) => boolean;
  can: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get<AuthUser>('/auth/me');
        return res.data;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = async (email: string, password: string, schoolId?: string) => {
    await api.post('/auth/login', { email, password, ...(schoolId ? { schoolId } : {}) });
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const logout = async () => {
    await api.post('/auth/logout');
    queryClient.clear();
    window.location.href = '/login';
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    // Refetch /auth/me so mustChangePassword flips to false in context.
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    return user.isSuperAdmin || user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, hasPermission, can: hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
