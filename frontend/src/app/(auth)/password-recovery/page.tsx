'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { Shield, AtSign } from 'lucide-react';

export default function PasswordRecoveryPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface-2 border border-border rounded-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-lg bg-surface-3 border border-border flex items-center justify-center relative">
            <Shield size={24} className="text-text-secondary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald" />
          </div>
        </div>

        {/* Label */}
        <div className="flex justify-center mb-4">
          <span className="text-[10px] font-mono bg-surface-3 text-text-muted px-3 py-1 rounded">
            SEC_OPS // AUTH_RECOVERY_PROTOCOL
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          Enter your verified email to receive a secure reset link.
        </p>

        {sent ? (
          <div className="text-center">
            <div className="bg-emerald-muted border border-emerald-border rounded-lg p-4 mb-6">
              <p className="text-sm text-emerald font-medium">Reset instructions sent!</p>
              <p className="text-xs text-text-secondary mt-1">Check your email for the reset link.</p>
            </div>
            <Link href="/sign-in" className="text-sm text-cyan hover:underline">
              ← Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="alex@devora.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<AtSign size={16} />}
              required
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Send Reset Instructions →
            </Button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-text-secondary mt-6">
            <Link href="/sign-in" className="text-text-primary hover:text-cyan">
              ← Return to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

