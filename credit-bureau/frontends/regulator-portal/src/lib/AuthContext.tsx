import React, { createContext, useContext, useMemo, useState } from 'react';
import { AuthTokens, getTokens, setTokens } from './auth';

type AuthContextValue = {
  tokens: AuthTokens | null;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setStateTokens] = useState<AuthTokens | null>(getTokens());

  const value = useMemo(
    () => ({
      tokens,
      login: (t: AuthTokens) => {
        setTokens(t);
        setStateTokens(t);
      },
      logout: () => {
        setTokens(null);
        setStateTokens(null);
      }
    }),
    [tokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
