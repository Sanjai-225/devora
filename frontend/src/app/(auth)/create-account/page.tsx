'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, Sparkles, Terminal } from 'lucide-react';

export default function CreateAccountPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'developer'>('user');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, name, role);
      router.push('/dashboard');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface-2 border border-border rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-text-primary text-center mb-1">
          Create your Devora account
        </h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          Choose User Mode for effortless website creation &amp; Auto-Build, or Developer Mode for
          full engineering controls.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Alex Rivera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="alex@company.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Account RBAC Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  role === 'user'
                    ? 'bg-cyan/10 border-cyan text-text-primary'
                    : 'bg-surface-1 border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-cyan" />
                  User (Creator)
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Includes Auto-Build &amp; guided UI
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('developer')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  role === 'developer'
                    ? 'bg-emerald/10 border-emerald text-text-primary'
                    : 'bg-surface-1 border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Terminal size={13} className="text-emerald" />
                  Developer
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Raw .env vault &amp; Integrations
                </div>
              </button>
            </div>
          </div>

          {/* TOS checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-3.5 h-3.5 rounded-[3px] border border-border-hover bg-surface-1 checked:bg-cyan checked:border-cyan appearance-none cursor-pointer relative
                after:content-[''] after:absolute after:inset-0 after:flex after:items-center after:justify-center
                checked:after:content-['✓'] after:text-[10px] after:font-bold after:text-canvas"
            />
            <span className="text-xs text-text-secondary">
              I agree to the{' '}
              <span className="text-cyan hover:underline cursor-pointer">Terms of Service</span>{' '}
              and <span className="text-cyan hover:underline cursor-pointer">Privacy Policy</span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red bg-red-muted border border-red-border rounded px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Create {role === 'user' ? 'User' : 'Developer'} Account →
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-text-primary font-medium hover:text-cyan">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
