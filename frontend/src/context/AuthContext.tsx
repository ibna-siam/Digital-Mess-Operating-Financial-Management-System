import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Mess } from '../types/index.js';
import { apiClient } from '../lib/apiClient.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeMess: Mess | null;
  userMesses: Mess[];
  isLoading: boolean;
  login: (token: string, user: User, mess?: Mess) => Promise<void>;
  logout: () => void;
  setActiveMess: (mess: Mess) => void;
  switchMess: (messId: string) => void;
  refreshMesses: () => Promise<Mess[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('messmate_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('messmate_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [userMesses, setUserMesses] = useState<Mess[]>([]);
  const [activeMess, setActiveMessState] = useState<Mess | null>(() => {
    const saved = localStorage.getItem('messmate_active_mess');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMesses = async (): Promise<Mess[]> => {
    try {
      const messes = await apiClient<Mess[]>('/messes');
      const list = Array.isArray(messes) ? messes : [];
      setUserMesses(list);
      if (list.length > 0) {
        if (!activeMess || !list.find((m) => m.id === activeMess.id)) {
          setActiveMess(list[0]);
        }
      } else {
        setActiveMessState(null);
        localStorage.removeItem('messmate_active_mess');
      }
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('messmate_token');
      if (storedToken) {
        try {
          const [res, messes] = await Promise.all([
            apiClient<{ user: User }>('/auth/me'),
            apiClient<Mess[]>('/messes').catch(() => []),
          ]);
          setUser(res.user);
          localStorage.setItem('messmate_user', JSON.stringify(res.user));

          const list = Array.isArray(messes) ? messes : [];
          setUserMesses(list);

          if (list.length > 0) {
            const saved = localStorage.getItem('messmate_active_mess');
            let matched: Mess | undefined;
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                matched = list.find((m) => m.id === parsed.id);
              } catch {}
            }
            const messToActivate = matched || list[0];
            setActiveMessState(messToActivate);
            localStorage.setItem('messmate_active_mess', JSON.stringify(messToActivate));
          } else {
            setActiveMessState(null);
            localStorage.removeItem('messmate_active_mess');
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('messmate_token');
          localStorage.removeItem('messmate_user');
          localStorage.removeItem('messmate_active_mess');
          setUser(null);
          setToken(null);
          setUserMesses([]);
          setActiveMessState(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (newToken: string, newUser: User, mess?: Mess) => {
    localStorage.setItem('messmate_token', newToken);
    localStorage.setItem('messmate_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    if (mess) {
      setActiveMess(mess);
      setUserMesses((prev) => (prev.some((m) => m.id === mess.id) ? prev : [...prev, mess]));
    } else {
      try {
        const messes = await apiClient<Mess[]>('/messes');
        const list = Array.isArray(messes) ? messes : [];
        setUserMesses(list);
        if (list.length > 0) {
          setActiveMess(list[0]);
        } else {
          setActiveMessState(null);
          localStorage.removeItem('messmate_active_mess');
        }
      } catch (e) {
        console.warn('Could not auto-fetch messes on login:', e);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('messmate_token');
    localStorage.removeItem('messmate_user');
    localStorage.removeItem('messmate_active_mess');
    try {
      sessionStorage.clear();
    } catch {
      // Ignore if sessionStorage unavailable
    }
    setToken(null);
    setUser(null);
    setUserMesses([]);
    setActiveMessState(null);
  };

  const setActiveMess = (mess: Mess) => {
    setActiveMessState(mess);
    localStorage.setItem('messmate_active_mess', JSON.stringify(mess));
  };

  const switchMess = (messId: string) => {
    const target = userMesses.find((m) => m.id === messId);
    if (target) {
      setActiveMess(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeMess,
        userMesses,
        isLoading,
        login,
        logout,
        setActiveMess,
        switchMess,
        refreshMesses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
