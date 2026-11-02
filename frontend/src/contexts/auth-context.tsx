'use client';

/**
 * Devora Role-Based Authentication Context (`user` vs `developer` RBAC).
 *
 * - `user` role (Default Guided Creator Mode):
 *    Simple, easy-to-understand dashboard & workflow, AI Website Suggestions,
 *    1-Click "Auto Build Website" (opens live multi-page website in a separate tab),
 *    full access to Tech Stack, Design Studio, Workspace modifications, ZIP export,
 *    and optional "Deploy to My Own Account" credential configuration.
 *
 * - `developer` role (`sanjay22522g@gmail.com` / `sanjai@2006`):
 *    Full Engineering Mode with raw AES-256 .env tables, PostgreSQL handshake tester,
 *    Git branch administration, and Platform Integrations vault (`ghp_`, `vcp_`, `rnd_`).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDeveloper: boolean;
  isUserRole: boolean;
  signIn: (
    email: string,
    password: string,
    preferredRole?: 'user' | 'developer',
  ) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: 'user' | 'developer',
  ) => Promise<User>;
  switchRole: (targetRole: 'user' | 'developer') => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'devora_rbac_user_v2';
const STORAGE_TOKEN_KEY = 'devora_rbac_token_v2';

export const DEVELOPER_ACCOUNT_USER: User = {
  uid: 'dev-sanjay-225',
  email: 'sanjay22522g@gmail.com',
  display_name: 'Sanjay G (Lead Developer)',
  photo_url: null,
  role: 'developer',
  permissions: [
    'create_website',
    'ai_suggestions',
    'tech_stack_customize',
    'design_studio',
    'workspace_modify',
    'live_preview_tab',
    'export_zip',
    'deploy_own_credentials',
    'raw_env_vault',
    'platform_integrations_hub',
    'git_branch_admin',
    'system_diagnostics',
  ],
  created_at: '2026-10-15T10:00:00Z',
  settings: {
    preferredLLM: 'gemini',
    defaultFramework: 'nextjs',
    defaultStyling: 'tailwind',
  },
};

export const DEFAULT_CREATOR_USER: User = {
  uid: 'user-creator-001',
  email: 'creator@devora.app',
  display_name: 'Alex Rivera (Website Creator)',
  photo_url: null,
  role: 'user',
  permissions: [
    'create_website',
    'auto_build',
    'ai_suggestions',
    'tech_stack_customize',
    'design_studio',
    'workspace_modify',
    'live_preview_tab',
    'export_zip',
    'deploy_own_credentials',
  ],
  created_at: '2026-11-01T10:00:00Z',
  settings: {
    preferredLLM: 'gemini',
    defaultFramework: 'nextjs',
    defaultStyling: 'tailwind',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEFAULT_CREATOR_USER);
  const [token, setToken] = useState<string>('dev-role-user-creator');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem(STORAGE_USER_KEY);
        const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(DEFAULT_CREATOR_USER));
        }
        if (savedToken) {
          setToken(savedToken);
        } else {
          localStorage.setItem(STORAGE_TOKEN_KEY, 'dev-role-user-creator');
        }
      } catch {
        // fallback to default creator user
      }
    }
    setLoading(false);
  }, []);

  const persistSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
        localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      preferredRole?: 'user' | 'developer',
    ): Promise<User> => {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const isDevEmail =
        cleanEmail === 'sanjay22522g@gmail.com' ||
        cleanEmail === 'sanjai22522g@gmail.com' ||
        cleanEmail === 'techno22522g@gmail.com' ||
        preferredRole === 'developer';

      if (isDevEmail) {
        if (
          (cleanEmail === 'sanjay22522g@gmail.com' ||
            cleanEmail === 'sanjai22522g@gmail.com') &&
          password !== 'sanjai@2006'
        ) {
          setLoading(false);
          throw new Error(
            'Invalid password for developer account sanjay22522g@gmail.com (use sanjai@2006)',
          );
        }
      }

      try {
        const res = await api.loginWithRole({
          email: cleanEmail,
          password,
          preferred_role: isDevEmail ? 'developer' : 'user',
        });
        persistSession(res.user, res.token);
        setLoading(false);
        return res.user;
      } catch {
        if (isDevEmail) {
          persistSession(DEVELOPER_ACCOUNT_USER, 'dev-role-developer-sanjay');
          setLoading(false);
          return DEVELOPER_ACCOUNT_USER;
        }
        const slug = cleanEmail.split('@')[0] || 'creator';
        const customUser: User = {
          ...DEFAULT_CREATOR_USER,
          uid: `user-${slug}`,
          email: cleanEmail,
          display_name:
            slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[._-]/g, ' ') + ' (User)',
          role: 'user',
        };
        persistSession(customUser, `dev-role-user-${slug}`);
        setLoading(false);
        return customUser;
      }
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: 'user' | 'developer' = 'user',
    ): Promise<User> => {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const targetRole =
        cleanEmail === 'sanjay22522g@gmail.com' || cleanEmail === 'sanjai22522g@gmail.com'
          ? 'developer'
          : role;

      try {
        const res = await api.registerWithRole({
          name: name.trim(),
          email: cleanEmail,
          password,
          role: targetRole,
        });
        persistSession(res.user, res.token);
        setLoading(false);
        return res.user;
      } catch {
        const slug = cleanEmail.split('@')[0] || 'creator';
        const createdUser: User =
          targetRole === 'developer'
            ? {
                ...DEVELOPER_ACCOUNT_USER,
                email: cleanEmail,
                display_name: name.trim() || DEVELOPER_ACCOUNT_USER.display_name,
              }
            : {
                ...DEFAULT_CREATOR_USER,
                uid: `user-${slug}`,
                email: cleanEmail,
                display_name: name.trim() || DEFAULT_CREATOR_USER.display_name,
                role: 'user',
              };
        const tok =
          targetRole === 'developer'
            ? 'dev-role-developer-sanjay'
            : `dev-role-user-${slug}`;
        persistSession(createdUser, tok);
        setLoading(false);
        return createdUser;
      }
    },
    [],
  );

  const switchRole = useCallback((targetRole: 'user' | 'developer') => {
    if (targetRole === 'developer') {
      persistSession(DEVELOPER_ACCOUNT_USER, 'dev-role-developer-sanjay');
    } else {
      persistSession(DEFAULT_CREATOR_USER, 'dev-role-user-creator');
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    await new Promise((r) => setTimeout(r, 400));
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return token || 'dev-role-user-creator';
  }, [token]);

  const isDeveloper = user?.role === 'developer';
  const isUserRole = !isDeveloper;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDeveloper,
        isUserRole,
        signIn,
        signUp,
        switchRole,
        signOut,
        resetPassword,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
