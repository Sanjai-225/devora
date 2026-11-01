'use client';

/**
 * Settings page — matches Stitch devora_settings design.
 * Tabs: General & Profile, AI Providers & Models, API Keys, Usage & Quotas, Project Defaults.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { Save, Zap, Key, BarChart3, FolderCog } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'General & Profile', icon: null },
  { id: 'ai', label: 'AI Providers & Models', icon: Zap, dot: true },
  { id: 'keys', label: 'API Keys & Credentials', icon: Key },
  { id: 'usage', label: 'Usage & Quotas', icon: BarChart3 },
  { id: 'defaults', label: 'Project Defaults', icon: FolderCog },
];

const AI_PROVIDERS = [
  {
    name: 'Google Gemini',
    badge: 'DEFAULT',
    description: 'Autonomous code synthesis, multi-file code refactors & UI components',
    latency: '~85ms',
    context: '200k Ctx',
    status: 'Active',
  },
  {
    name: 'OpenAI GPT-4o',
    badge: 'FALLBACK',
    description: 'Multimodal visual wireframe analysis & structural system reasoning',
    latency: '~110ms',
    context: '128k Ctx',
    status: 'Standby',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email] = useState(user?.email || '');

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage AI models, API keys, usage limits, and workspace defaults.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Discard</Button>
          <Button variant="primary" icon={<Save size={14} />}>Save Changes</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 h-10 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                activeTab === tab.id
                  ? 'border-cyan text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              {tab.dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card>
                <CardContent className="space-y-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3">Profile Information</h3>
                  <Input
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Input
                    label="Email"
                    value={email}
                    disabled
                    hint="Email is managed by your authentication provider"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-red mb-2 flex items-center gap-2">
                    ⚠ Danger Zone
                  </h3>
                  <p className="text-xs text-text-secondary mb-4">
                    Irreversible actions that affect repository linkages, live preview environments, and workspace history.
                  </p>
                  <div className="space-y-2">
                    <Button variant="secondary" className="w-full justify-between">
                      Transfer Workspace Ownership
                      <span className="text-text-muted">→</span>
                    </Button>
                    <Button variant="danger" className="w-full justify-between">
                      Delete Workspace & Purge Cache
                      <span>🗑</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-text-primary">AI Provider & Engine Orchestration</h3>
                    <span className="text-[10px] font-mono text-emerald bg-emerald-muted border border-emerald-border px-2 py-0.5 rounded">
                      CLUSTER HEALTHY
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    Configure autonomous code synthesis engines, multi-agent fallbacks, and real-time inference routing.
                  </p>
                  <div className="space-y-3">
                    {AI_PROVIDERS.map((provider) => (
                      <div
                        key={provider.name}
                        className="flex items-center gap-4 p-3 bg-surface-1 border border-border rounded-lg"
                      >
                        <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
                          <Zap size={16} className="text-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">{provider.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              provider.badge === 'DEFAULT'
                                ? 'bg-cyan-muted text-cyan border border-cyan-border'
                                : 'bg-surface-3 text-text-muted border border-border'
                            }`}>
                              {provider.badge}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{provider.description}</p>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <p className="text-text-muted">{provider.latency}</p>
                          <p className="text-text-muted">{provider.context}</p>
                        </div>
                        <span className={`text-xs font-mono ${
                          provider.status === 'Active' ? 'text-emerald' : 'text-text-muted'
                        }`}>
                          • {provider.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-text-primary mb-3">Autonomous Guardrails & Execution</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Automatic AST Mutation & Linting', desc: 'Auto-resolves ESLint errors prior to compile', on: true },
                      { label: 'Terminal Execution & Test Auto-Fix', desc: 'Isolated shell evaluation', on: true },
                      { label: 'Approval for Database Migrations', desc: 'Pauses agent on non-reversible schema changes', on: true },
                      { label: 'Live Hot-Reload Canvas Sync', desc: 'Streams AST delta directly to canvas DOM', on: true },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-surface-1 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary">{item.label}</span>
                          <div className={`w-8 h-[18px] rounded-full relative cursor-pointer transition-colors ${
                            item.on ? 'bg-cyan' : 'bg-surface-3'
                          }`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-transform ${
                              item.on ? 'translate-x-[18px]' : 'translate-x-[2px]'
                            }`} />
                          </div>
                        </div>
                        <p className="text-xs text-text-muted">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'keys' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-text-primary mb-4">API Keys & Secrets Vault</h3>
                <p className="text-xs text-text-secondary mb-4">
                  Manage personal tokens, automated deployment credentials, and third-party provider keys.
                </p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[10px] font-mono text-text-muted uppercase px-4 py-2">Token Name / Hash</th>
                        <th className="text-left text-[10px] font-mono text-text-muted uppercase px-4 py-2">Scope & Permissions</th>
                        <th className="text-left text-[10px] font-mono text-text-muted uppercase px-4 py-2">Created / Last Used</th>
                        <th className="text-left text-[10px] font-mono text-text-muted uppercase px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="px-4 py-3">
                          <p className="text-sm text-text-primary">Gemini API Key</p>
                          <code className="text-[10px] font-mono text-text-muted">AQ.Ab8R••••••••••da6r</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary">Full Access (Read/Generate)</td>
                        <td className="px-4 py-3 text-xs text-text-muted">Today</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-red cursor-pointer hover:underline">Revoke</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button variant="secondary" size="sm">+ Create Secret Key</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'usage' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-text-primary mb-4">Usage & Quotas</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Monthly Agent Syntheses', used: 12, max: 100, unit: '' },
                    { label: 'Gemini Tokens', used: 1.2, max: 25, unit: 'M' },
                    { label: 'Edge Sandbox Compute', used: 18, max: 500, unit: 'h' },
                  ].map((q) => (
                    <div key={q.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-text-primary">{q.label}</span>
                        <span className="text-xs text-text-secondary">
                          {q.used}{q.unit} / {q.max}{q.unit} ({Math.round((q.used / q.max) * 100)}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan rounded-full transition-all"
                          style={{ width: `${Math.min((q.used / q.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'defaults' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-text-primary mb-2">Project Defaults & Toolchain</h3>
                <p className="text-xs text-text-secondary mb-4">
                  Initial blueprints applied automatically when the agent creates a new web workspace.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase mb-1.5">Core Framework</p>
                    <div className="h-10 px-3 bg-surface-1 border border-border rounded-[4px] flex items-center text-sm text-text-primary">
                      Next.js (App Router) + TypeScript
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase mb-1.5">Styling Engine</p>
                    <div className="h-10 px-3 bg-surface-1 border border-border rounded-[4px] flex items-center text-sm text-text-primary">
                      Tailwind CSS + Geist Sans
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <h3 className="text-sm font-medium text-text-primary mb-3">Active Session</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-surface-3 border border-border flex items-center justify-center text-lg font-semibold text-text-secondary">
                  D
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{user?.display_name || 'Dev User'}</p>
                  <p className="text-xs text-text-muted">{user?.email || 'dev@devora.local'}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Role:</span>
                  <span className="text-cyan">Developer (Admin)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">MFA Security:</span>
                  <span className="text-text-secondary">Not configured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

