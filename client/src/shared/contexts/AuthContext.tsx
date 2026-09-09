import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../../features/auth/api/auth';
import type { UpdateMeInput, User } from '../types/index';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateMe: (data: UpdateMeInput) => Promise<User>;
  uploadAvatar: (file: File) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login({ email, password });
    localStorage.setItem('token', result.token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  async function updateMe(data: UpdateMeInput) {
    const updated = await authApi.updateMe(data);
    setUser(updated);
    return updated;
  }

  async function uploadAvatar(file: File) {
    const updated = await authApi.uploadAvatar(file);
    setUser(updated);
    return updated;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateMe, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
