'use client';

/**
 * Create Website page — matches Stitch devora_create_website design.
 * Project name, NL requirements textarea, tech stack selection.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Sparkles, Check, Globe } from 'lucide-react';

const FRAMEWORKS = [
  { id: 'nextjs', label: 'Next.js (App)', selected: true },
  { id: 'vite-react', label: 'Vite + React', selected: false },
  { id: 'remix', label: 'Remix Run', selected: false },
  { id: 'astro', label: 'Astro', selected: false },
];

const STYLING = [
  { id: 'tailwind', label: 'Tailwind CSS', selected: true },
  { id: 'css-modules', label: 'CSS Modules', selected: false },
  { id: 'vanilla', label: 'Vanilla CSS', selected: false },
  { id: 'stylex', label: 'StyleX', selected: false },
];

const BACKEND = [
  { id: 'typescript', label: 'TypeScript Strict', selected: true },
  { id: 'supabase', label: 'Supabase DB', selected: false },
  { id: 'prisma', label: 'Prisma ORM', selected: false },
  { id: 'node-api', label: 'Node.js API', selected: false },
];

const AUTH_OPTIONS = [
  { id: 'nextauth', label: 'NextAuth.js', selected: false },
  { id: 'clerk', label: 'Clerk Auth', selected: false },
  { id: 'supabase-auth', label: 'Supabase Auth', selected: false },
  { id: 'none', label: 'None (Public)', selected: false },
];

const TEMPLATES = [
  { icon: '📊', label: 'SaaS Analytics Dashboard with Team Permissions' },
  { icon: '💻', label: 'AI Developer Tool with Monaco Code Editor & Live Preview' },
  { icon: '🛍️', label: 'Modern E-commerce Storefront with Stripe & Algolia' },
  { icon: '🏢', label: 'B2B Customer Portal with Role-Based Auth & Invoicing' },
];

function StackSection({
  title,
  badge,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  badge?: string;
  options: { id: string; label: string }[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{title}</p>
        {badge && <span className="text-[10px] font-mono text-text-muted">{badge}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = selectedIds.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`h-9 px-3 rounded-[4px] text-sm font-medium text-left transition-colors flex items-center gap-2 ${
                selected
                  ? 'bg-surface-3 text-text-primary border border-border-hover'
                  : 'bg-surface-1 text-text-secondary border border-border hover:border-border-hover'
              }`}
            >
              {opt.label}
              {selected && <Check size={14} className="ml-auto text-cyan" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CreateWebsitePage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set(['nextjs']));
  const [selectedStyling, setSelectedStyling] = useState<Set<string>>(new Set(['tailwind']));
  const [selectedBackend, setSelectedBackend] = useState<Set<string>>(new Set(['typescript']));
  const [selectedAuth, setSelectedAuth] = useState<Set<string>>(new Set());

  const toggleInSet = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const tokenCount = description.split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setLoading(true);

    const stackHint = [
      `Frameworks: ${Array.from(selectedFrameworks).join(', ')}`,
      `Styling: ${Array.from(selectedStyling).join(', ')}`,
      `Backend: ${Array.from(selectedBackend).join(', ')}`,
      selectedAuth.size > 0 ? `Auth: ${Array.from(selectedAuth).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const fullDescription = `${description.trim()}\n\n[Preferred Stack: ${stackHint}]`;

    try {
      const token = (await getToken()) || 'dev-token';
      const created = await api.createProject(token, {
        name: name.trim(),
        description: fullDescription,
      });
      await api.startAgent(token, created.id, fullDescription);
      router.push(`/projects/${created.id}`);
    } catch {
      // Fallback for offline/static preview mode: store in sessionStorage and route to synthesis
      const fallbackId = `proj-${Date.now().toString(36)}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `devora_project_${fallbackId}`,
          JSON.stringify({
            id: fallbackId,
            name: name.trim(),
            description: fullDescription,
            stack: {
              framework: Array.from(selectedFrameworks)[0] || 'nextjs',
              styling: Array.from(selectedStyling)[0] || 'tailwind',
              backend: Array.from(selectedBackend)[0] || 'nextjs_api',
              auth: Array.from(selectedAuth)[0] || 'email_password',
            },
          }),
        );
      }
      router.push(`/projects/${fallbackId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="text-text-muted">Projects</span>
        <span className="text-text-muted">/</span>
        <span className="text-cyan">New Website</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-1">Describe your application</h1>
      <p className="text-sm text-text-secondary mb-8">
        Devora&apos;s autonomous agents will plan architecture, design UI, generate clean Next.js/React code, and run test suites.
      </p>

      <div className="grid grid-cols-3 gap-6">
        {/* Main form — 2 cols */}
        <form onSubmit={handleSubmit} className="col-span-2 space-y-6">
          {/* Project name */}
          <Card>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Project Name *"
                  placeholder="Novastride Fleet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-primary">Staging Endpoint</label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-surface-1 border border-border rounded-[4px]">
                    <Globe size={14} className="text-cyan" />
                    <span className="text-sm text-text-muted">
                      {name ? name.toLowerCase().replace(/\s+/g, '-') : 'your-project'}.devora.app
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan" />
                  <span className="text-sm font-medium text-text-primary">
                    Natural-Language Requirements & Architecture
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-surface-3 text-text-secondary px-2 py-0.5 rounded">
                  Autonomous Engine v0.2
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Build a high-performance fleet intelligence dashboard for electric vehicle logistics. It needs an interactive live telemetry map showing vehicle routes, battery degradation graphs using Recharts, an alert feed with severity filters (critical, warning, nominal), vehicle maintenance scheduling table with modal forms, and Stripe integration for fleet subscription tiers. Use Next.js 14 App Router, TypeScript, Tailwind CSS, and mock sensor WebSockets."
                className="w-full h-40 px-4 py-3 bg-surface-1 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                required
              />
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${tokenCount > 0 ? 'bg-cyan' : 'bg-text-muted'}`} />
                  <span className="text-text-secondary">{tokenCount} tokens</span>
                  <span className="text-text-muted">/ 4,096 max</span>
                </span>
                <span className="text-xs text-text-muted">
                  Complexity: {tokenCount > 50 ? 'High Modular' : tokenCount > 20 ? 'Medium' : 'Low'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <div>
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Or initialize from benchmark templates
            </p>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    if (!name) setName(t.label.split(' with ')[0]);
                    setDescription(t.label);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors text-left"
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    Target Architecture & Toolchain
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-muted text-cyan border border-cyan-border px-1.5 py-0.5 rounded">
                    Customizable
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <StackSection
                  title="Framework"
                  options={FRAMEWORKS}
                  selectedIds={selectedFrameworks}
                  onToggle={(id) => setSelectedFrameworks((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="Styling & Tokens"
                  badge="Geist UI"
                  options={STYLING}
                  selectedIds={selectedStyling}
                  onToggle={(id) => setSelectedStyling((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="State & Backend"
                  options={BACKEND}
                  selectedIds={selectedBackend}
                  onToggle={(id) => setSelectedBackend((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="Authentication"
                  badge="Zero-Trust"
                  options={AUTH_OPTIONS}
                  selectedIds={selectedAuth}
                  onToggle={(id) => setSelectedAuth((s) => toggleInSet(s, id))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Button variant="secondary" type="button" icon={<span>📋</span>}>Save Draft</Button>
            <Button type="submit" variant="primary" size="lg" loading={loading}>
              Generate & Analyze Requirements →
            </Button>
          </div>
        </form>

        {/* Right sidebar — Synthesis Spec */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">Synthesis Spec</h3>
                <span className="text-[10px] font-mono text-emerald bg-emerald-muted border border-emerald-border px-1.5 py-0.5 rounded">
                  Ready
                </span>
              </div>
              <div className="aspect-video bg-surface-3 border border-border rounded-lg mb-3 flex items-center justify-center">
                <span className="text-xs text-text-muted">Preview will appear here</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-cyan">⚡</span>
                  <span className="text-text-secondary">Architecture Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">📦</span>
                  <span className="text-text-secondary">Data Modeling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">🧪</span>
                  <span className="text-text-secondary">Test & Type Safety</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald">⊙</span>
                <span className="text-sm font-medium text-text-primary">Autonomous Execution</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Devora builds complete repository branches with valid configurations,
                automatic CI validation, and zero uninstantiated placeholder stubs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
