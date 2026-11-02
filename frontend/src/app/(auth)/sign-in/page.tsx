'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import {
  Eye,
  EyeOff,
  AtSign,
  KeyRound,
  Sparkles,
  Terminal,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'user' | 'developer'>('user');
  const [email, setEmail] = useState('creator@devora.app');
  const [password, setPassword] = useState('user@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRolePreset = (role: 'user' | 'developer') => {
    setSelectedRole(role);
    setError('');
    if (role === 'developer') {
      setEmail('sanjay22522g@gmail.com');
      setPassword('sanjai@2006');
    } else {
      setEmail('creator@devora.app');
      setPassword('user@2026');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password, selectedRole);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid credentials. For Developer login use sanjay22522g@gmail.com / sanjai@2006',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-surface-2 border border-border rounded-xl p-8 space-y-6">
        {/* Status header */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
            DEVORA DUAL-ROLE RBAC AUTH
          </span>
          <span className="text-[10px] font-mono text-cyan">
            {selectedRole === 'user' ? 'ROLE: USER (CREATOR)' : 'ROLE: DEVELOPER (ADMIN)'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-text-primary mb-1">Sign in to Devora</h1>
          <p className="text-sm text-text-secondary">
            Choose your login role below: <strong className="text-text-primary">User Mode</strong>{' '}
            for guided website creation &amp; 1-click Auto-Build, or{' '}
            <strong className="text-cyan">Developer Mode</strong> for full engineering controls.
          </p>
        </div>

        {/* Role Selector Tabs (User vs Developer) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSelectRolePreset('user')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedRole === 'user'
                ? 'bg-cyan/10 border-cyan text-text-primary shadow-sm'
                : 'bg-surface-1 border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan" />
                User Login
              </span>
              {selectedRole === 'user' && (
                <span className="text-[9px] font-mono bg-cyan text-canvas px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-snug">
              Simple workflow, AI suggestions, 1-Click Auto-Build in new tab &amp; easy edits.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRolePreset('developer')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedRole === 'developer'
                ? 'bg-emerald/10 border-emerald text-text-primary shadow-sm'
                : 'bg-surface-1 border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Terminal size={14} className="text-emerald" />
                Developer Login
              </span>
              {selectedRole === 'developer' && (
                <span className="text-[9px] font-mono bg-emerald text-canvas px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-snug">
              Full AES-256 .env vault, PostgreSQL tester, Git branches &amp; Integrations hub.
            </p>
          </button>
        </div>

        {/* Role Explanation Banner */}
        <div className="p-3 rounded-lg bg-surface-1 border border-border text-xs space-y-1">
          {selectedRole === 'user' ? (
            <>
              <div className="font-medium text-cyan flex items-center gap-1.5">
                <UserCheck size={14} />
                <span>User Role Features (All Capabilities + Exclusive Auto-Build):</span>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Includes <strong className="text-text-primary">Auto Build Website</strong> (opens
                working multi-page site in a separate tab), AI tech stack &amp; design suggestions,
                Design Studio, live chat modifications, ZIP export, and optional deployment to your
                own account credentials.
              </p>
            </>
          ) : (
            <>
              <div className="font-medium text-emerald flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>Developer Account Configured: sanjay22522g@gmail.com</span>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Pre-filled with your developer ID (<code className="font-mono text-text-primary">sanjay22522g@gmail.com</code>) and password (<code className="font-mono text-text-primary">sanjai@2006</code>). Unlocks raw server `.env` tables and platform integrations.
              </p>
            </>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={selectedRole === 'developer' ? 'Developer Email' : 'User Email'}
            type="email"
            placeholder={
              selectedRole === 'developer' ? 'sanjay22522g@gmail.com' : 'creator@devora.app'
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<AtSign size={16} />}
            required
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<KeyRound size={16} />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] font-mono text-text-muted">
                {selectedRole === 'developer'
                  ? 'Dev ID: sanjay22522g@gmail.com / Pass: sanjai@2006'
                  : 'Demo User: creator@devora.app / Pass: user@2026'}
              </span>
              <Link href="/password-recovery" className="text-xs text-cyan hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red bg-red-muted border border-red-border rounded px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {selectedRole === 'developer'
              ? 'Sign In as Developer (Engineering Console) →'
              : 'Sign In as User (Guided Creator + Auto-Build) →'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/create-account" className="text-text-primary font-medium hover:text-cyan">
            Create User or Developer Account
          </Link>
        </p>
      </div>
    </div>
  );
}
