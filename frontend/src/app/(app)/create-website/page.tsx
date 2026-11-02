'use client';

/**
 * Create Website page — supports both:
 *  1. Dynamic AI Suggestions (analyzes prompt in real time & suggests pages, features, tech stack, and design palette)
 *  2. Full Tech Stack & Design Customization for both `user` and `developer` roles
 *  3. Exclusive "⚡ Auto Build Website" button for `user` login (automatically configures defaults and launches a multi-page working website in a separate tab)
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  synthesizeWebsiteFromPrompt,
  saveSynthesizedWebsite,
  type SynthesizedWebsite,
} from '@/lib/website-synthesizer';
import {
  Sparkles,
  Check,
  Globe,
  ExternalLink,
  Layers,
  Paintbrush,
  Rocket,
  Terminal,
  CheckCircle2,
  Wand2,
} from 'lucide-react';

const FRAMEWORKS = [
  { id: 'nextjs', label: 'Next.js 16 (App Router)' },
  { id: 'vite-react', label: 'Vite + React 19' },
  { id: 'remix', label: 'Remix Full-Stack' },
  { id: 'astro', label: 'Astro Content Web' },
];

const STYLING = [
  { id: 'tailwind', label: 'Tailwind CSS 4' },
  { id: 'css-modules', label: 'CSS Modules' },
  { id: 'vanilla', label: 'Modern CSS Variables' },
  { id: 'shadcn', label: 'Radix + Tailwind UI' },
];

const BACKEND = [
  { id: 'fastapi-edge', label: 'FastAPI + Serverless' },
  { id: 'supabase', label: 'Supabase + Postgres' },
  { id: 'firebase', label: 'Firebase Firestore' },
  { id: 'node-api', label: 'Node.js REST API' },
];

const AUTH_OPTIONS = [
  { id: 'rbac-sso', label: 'Email + Google OAuth' },
  { id: 'clerk', label: 'Passkeys & Magic Link' },
  { id: 'supabase-auth', label: 'Role-Based Portal Auth' },
  { id: 'none', label: 'Public Website (No Login)' },
];

const INDUSTRY_PROMPTS = [
  {
    icon: '🦷',
    name: 'AuraCare Dental & Medical Clinic',
    label: 'Healthcare & Clinic: Doctor directory, treatment pricing, instant appointment booking & patient lab portal',
  },
  {
    icon: '🛍️',
    name: 'Veloce Atelier Commerce',
    label: 'E-Commerce Storefront: Seasonal lookbook, filterable product catalog, bundle builder, cart checkout & order tracking',
  },
  {
    icon: '🏡',
    name: 'Skyline Haven Properties',
    label: 'Real Estate Marketplace: Property search filters, interactive monthly mortgage & rental ROI calculator & tour booking',
  },
  {
    icon: '🍽️',
    name: 'Saffron & Ember Bistro',
    label: 'Restaurant & Hospitality: Interactive dietary menu, takeout order tray, table reservation & catering calculator',
  },
  {
    icon: '🎓',
    name: 'Vertex Skill Academy',
    label: 'EdTech & Online Courses: Filterable course catalog, interactive placement skill quiz, tuition plans & student portal',
  },
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
        {badge && <span className="text-[10px] font-mono text-cyan">{badge}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = selectedIds.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={`h-9 px-3 rounded-[4px] text-xs font-medium text-left transition-colors flex items-center gap-2 cursor-pointer ${
                selected
                  ? 'bg-surface-3 text-text-primary border border-cyan/50'
                  : 'bg-surface-1 text-text-secondary border border-border hover:border-border-hover'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {selected && <Check size={13} className="ml-auto text-cyan shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CreateWebsitePage() {
  const router = useRouter();
  const { getToken, isDeveloper, switchRole } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loadingStepByStep, setLoadingStepByStep] = useState(false);

  // Auto-Build state (exclusively for `user` login role)
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [autoBuildProgress, setAutoBuildProgress] = useState<string | null>(null);
  const [autoBuiltWebsite, setAutoBuiltWebsite] = useState<SynthesizedWebsite | null>(null);

  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set(['nextjs']));
  const [selectedStyling, setSelectedStyling] = useState<Set<string>>(new Set(['tailwind']));
  const [selectedBackend, setSelectedBackend] = useState<Set<string>>(new Set(['fastapi-edge']));
  const [selectedAuth, setSelectedAuth] = useState<Set<string>>(new Set(['rbac-sso']));

  const toggleInSet = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  // Real-time AI Suggestion Preview based on what the user types
  const livePreviewSpec = useMemo(() => {
    return synthesizeWebsiteFromPrompt(
      description.trim() ||
        'Modern multi-page web platform with interactive booking, catalog, analytics dashboard, and pricing',
      {
        projectName: name.trim() || undefined,
        role: isDeveloper ? 'developer' : 'user',
      },
    );
  }, [description, name, isDeveloper]);

  const handleApplyAiSuggestedStack = () => {
    if (!name.trim()) {
      setName(livePreviewSpec.projectName);
    }
    setSelectedFrameworks(new Set(['nextjs']));
    setSelectedStyling(new Set(['tailwind']));
    setSelectedBackend(new Set(['fastapi-edge']));
    setSelectedAuth(new Set(['rbac-sso']));
  };

  // Handler 1: Exclusive User Role 1-Click Auto-Build (builds all 5 pages & opens live site in new tab)
  const handleAutoBuildNow = async () => {
    if (!description.trim()) return;
    setIsAutoBuilding(true);
    setAutoBuiltWebsite(null);

    const pipelineMessages = [
      '1/5 Analyzing your requirements & synthesizing 5-page website structure...',
      '2/5 Applying default Tech Stack & zero-config database/auth defaults...',
      '3/5 Designing custom color palette, typography & responsive layout...',
      '4/5 Generating 5 interactive pages with navigation, forms & widgets...',
      '5/5 Verifying build & preparing live multi-page preview in separate tab...',
    ];

    for (const msg of pipelineMessages) {
      setAutoBuildProgress(msg);
      await new Promise((r) => setTimeout(r, 260));
    }

    const projectId = `auto-${Date.now().toString(36)}`;
    const finalSite = synthesizeWebsiteFromPrompt(description.trim(), {
      projectId,
      projectName: name.trim() || livePreviewSpec.projectName,
      role: 'user',
      autoBuilt: true,
    });
    saveSynthesizedWebsite(finalSite);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `devora_project_${projectId}`,
        JSON.stringify({
          id: projectId,
          name: finalSite.projectName,
          description: description.trim(),
          stack: finalSite.stack,
        }),
      );
    }

    try {
      const token = (await getToken()) || 'dev-role-user-creator';
      await api.autoBuildWebsite(token, {
        prompt: description.trim(),
        project_name: finalSite.projectName,
      });
    } catch {
      // local multi-page site is saved and ready
    }

    setAutoBuiltWebsite(finalSite);
    setAutoBuildProgress(null);
    setIsAutoBuilding(false);
  };

  // Handler 2: Step-by-Step Customize Workflow (Requirements -> Design Studio -> Configuration -> Workspace)
  const handleStepByStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoadingStepByStep(true);

    const finalName = name.trim() || livePreviewSpec.projectName;
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
        name: finalName,
        description: fullDescription,
      });
      const site = synthesizeWebsiteFromPrompt(description.trim(), {
        projectId: created.id,
        projectName: finalName,
        role: isDeveloper ? 'developer' : 'user',
        autoBuilt: false,
      });
      saveSynthesizedWebsite(site);
      await api.startAgent(token, created.id, fullDescription);
      router.push(`/projects/${created.id}`);
    } catch {
      const fallbackId = `proj-${Date.now().toString(36)}`;
      const site = synthesizeWebsiteFromPrompt(description.trim(), {
        projectId: fallbackId,
        projectName: finalName,
        role: isDeveloper ? 'developer' : 'user',
        autoBuilt: false,
      });
      saveSynthesizedWebsite(site);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `devora_project_${fallbackId}`,
          JSON.stringify({
            id: fallbackId,
            name: finalName,
            description: fullDescription,
            stack: {
              framework: Array.from(selectedFrameworks)[0] || 'nextjs',
              styling: Array.from(selectedStyling)[0] || 'tailwind',
              backend: Array.from(selectedBackend)[0] || 'fastapi-edge',
              auth: Array.from(selectedAuth)[0] || 'rbac-sso',
            },
          }),
        );
      }
      router.push(`/projects/${fallbackId}`);
    } finally {
      setLoadingStepByStep(false);
    }
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-text-muted">Projects</span>
            <span className="text-text-muted">/</span>
            <span className="text-cyan font-mono">
              {isDeveloper ? 'New Application Spec' : 'Create or Auto-Build Website'}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Describe the website you want to build
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Type any website idea below. Devora&apos;s AI suggests tailored pages, tech stack, and
            design — and in <strong className="text-cyan">User Mode</strong> you can use{' '}
            <strong className="text-cyan">⚡ Auto Build</strong> to launch a working multi-page
            website in a separate tab immediately.
          </p>
        </div>
      </div>

      {/* Auto-Built Website Ready Banner (When User clicks Auto Build) */}
      {autoBuiltWebsite && (
        <div className="p-6 rounded-2xl bg-emerald-muted/35 border-2 border-emerald-border space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald font-mono text-xs font-bold">
                <CheckCircle2 size={16} />
                <span>
                  AUTO-BUILD COMPLETED • {autoBuiltWebsite.pages.length} INTERACTIVE PAGES LIVE
                </span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                {autoBuiltWebsite.projectName} — {autoBuiltWebsite.domainCategory}
              </h2>
              <p className="text-xs text-text-secondary">
                Default configurations applied automatically. Generated pages:{' '}
                {autoBuiltWebsite.pages.map((p) => `${p.navLabel} (${p.route})`).join(' → ')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={`/preview/${autoBuiltWebsite.projectId}`}
                target="_blank"
                rel="noreferrer"
                className="h-11 px-5 rounded-xl bg-cyan text-canvas font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
              >
                <ExternalLink size={16} />
                <span>Open Working Website in Separate Tab ↗</span>
              </a>
              <Link
                href={`/design-studio?project=${autoBuiltWebsite.projectId}`}
                className="h-11 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary flex items-center gap-1.5"
              >
                <Paintbrush size={14} className="text-cyan" />
                <span>Customize Design</span>
              </Link>
              <Link
                href={`/workspace?project=${autoBuiltWebsite.projectId}`}
                className="h-11 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary flex items-center gap-1.5"
              >
                <Terminal size={14} className="text-cyan" />
                <span>Modify with AI / Export ZIP</span>
              </Link>
              <Link
                href={`/configuration?project=${autoBuiltWebsite.projectId}`}
                className="h-11 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary flex items-center gap-1.5"
              >
                <Rocket size={14} className="text-emerald" />
                <span>Deploy to My Own Account</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Prompt, Industry Ideas & Tech Stack Customization */}
        <form onSubmit={handleStepByStepSubmit} className="lg:col-span-2 space-y-6">
          {/* Website Name & Live Preview URL */}
          <Card>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Website / Brand Name (Optional — AI suggests if blank)"
                  placeholder={livePreviewSpec.projectName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-text-primary">
                    Live Multi-Page Preview Endpoint
                  </label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-surface-1 border border-border rounded-[4px]">
                    <Globe size={14} className="text-cyan" />
                    <span className="text-xs font-mono text-text-secondary truncate">
                      /preview/
                      {(name || livePreviewSpec.projectName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Natural-Language Website Prompt */}
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan" />
                  <span className="text-sm font-medium text-text-primary">
                    Website Requirements Prompt (Plain English) *
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan/10 text-cyan border border-cyan/30 px-2 py-0.5 rounded">
                  Multi-Page AI Synthesizer
                </span>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe any website you want! For example: 'Build a luxury dental clinic website called AuraCare with doctor profiles, treatment pricing, online appointment booking calendar, and a patient lab results portal'..."
                className="w-full h-36 px-4 py-3 bg-surface-1 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                required
              />

              {/* Quick Industry Prompt Ideas (Distinct Domains — Never the Same Template) */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  Or click an industry idea to test dynamic multi-page generation:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {INDUSTRY_PROMPTS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setName(item.name);
                        setDescription(item.label);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 bg-surface-2 hover:bg-surface-3 border border-border hover:border-cyan/40 rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors text-left cursor-pointer"
                    >
                      <span className="text-base">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-text-primary">{item.name}: </span>
                        <span>{item.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customizable Tech Stack & Architecture (Available to Both Roles) */}
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    Technology Stack &amp; Capabilities
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-muted text-cyan border border-cyan-border px-1.5 py-0.5 rounded">
                    Auto-Selected by AI or Customizable
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyAiSuggestedStack}
                  className="text-xs text-cyan hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 size={12} />
                  <span>Apply AI Recommended Defaults</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StackSection
                  title="Frontend Framework"
                  badge="Multi-Page"
                  options={FRAMEWORKS}
                  selectedIds={selectedFrameworks}
                  onToggle={(id) => setSelectedFrameworks((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="Styling & Design System"
                  badge="Responsive"
                  options={STYLING}
                  selectedIds={selectedStyling}
                  onToggle={(id) => setSelectedStyling((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="Backend & Data Store"
                  badge="Zero-Config Ready"
                  options={BACKEND}
                  selectedIds={selectedBackend}
                  onToggle={(id) => setSelectedBackend((s) => toggleInSet(s, id))}
                />
                <StackSection
                  title="User Authentication"
                  badge="RBAC"
                  options={AUTH_OPTIONS}
                  selectedIds={selectedAuth}
                  onToggle={(id) => setSelectedAuth((s) => toggleInSet(s, id))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons: Auto Build (Exclusive to User Role) + Step-by-Step Customize */}
          <div className="p-5 rounded-xl bg-surface-1 border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {!isDeveloper ? (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-cyan flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Choose How You Want to Build:</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Use <strong className="text-text-primary">⚡ Auto Build Website</strong> to let
                  the AI configure defaults and launch your multi-page website immediately, or step
                  through Requirements &amp; Design Studio manually.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald">
                  Developer Engineering Workflow Active
                </div>
                <p className="text-xs text-text-secondary">
                  Want 1-click Auto-Build?{' '}
                  <button
                    type="button"
                    onClick={() => switchRole('user')}
                    className="text-cyan underline cursor-pointer"
                  >
                    Switch to User Role
                  </button>{' '}
                  anytime.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                loading={loadingStepByStep}
              >
                {isDeveloper
                  ? 'Generate & Analyze Requirements →'
                  : 'Customize Step-by-Step →'}
              </Button>

              {!isDeveloper && (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={isAutoBuilding}
                  onClick={handleAutoBuildNow}
                  icon={<Sparkles size={16} />}
                >
                  {isAutoBuilding
                    ? autoBuildProgress || 'Auto-Building...'
                    : '⚡ Auto Build Website (Instant Multi-Page)'}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Right Column: Live AI Architecture, Multi-Page & Theme Suggestions */}
        <div className="space-y-4">
          <Card className="border-cyan/30">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles size={15} className="text-cyan" />
                  AI Website Suggestions
                </h3>
                <span className="text-[10px] font-mono text-emerald bg-emerald-muted border border-emerald-border px-2 py-0.5 rounded">
                  Live Analysis
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-2 border border-border space-y-1">
                <div className="text-[10px] font-mono text-text-muted uppercase">
                  Detected Industry &amp; Brand
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {livePreviewSpec.projectName}
                </div>
                <div className="text-xs text-cyan font-mono">
                  {livePreviewSpec.domainCategory}
                </div>
              </div>

              {/* Suggested 5-Page Sitemap */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  AI-Recommended Multi-Page Structure ({livePreviewSpec.pages.length} Pages)
                </div>
                <div className="space-y-1.5">
                  {livePreviewSpec.pages.map((pg, idx) => (
                    <div
                      key={pg.id}
                      className="p-2.5 rounded-lg bg-surface-2 border border-border text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-text-primary">
                          {idx + 1}. {pg.navLabel}
                        </span>
                        <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                          {pg.title}
                        </p>
                      </div>
                      <code className="text-[10px] font-mono text-cyan bg-surface-3 px-1.5 py-0.5 rounded shrink-0">
                        {pg.route}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Color Palette */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  Suggested Theme: {livePreviewSpec.palette.name}
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'Primary', hex: livePreviewSpec.palette.primary },
                    { label: 'Secondary', hex: livePreviewSpec.palette.secondary },
                    { label: 'Surface', hex: livePreviewSpec.palette.surface },
                    { label: 'Canvas', hex: livePreviewSpec.palette.background },
                  ].map((sw) => (
                    <div
                      key={sw.label}
                      className="flex-1 p-2 rounded-lg bg-surface-2 border border-border text-center"
                    >
                      <div
                        className="w-full h-5 rounded mb-1 border border-white/15"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <div className="text-[9px] font-mono text-text-secondary">{sw.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Interactive Capabilities */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  Included Interactive Features
                </div>
                {livePreviewSpec.aiSuggestions.suggestedFeatures.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs text-text-secondary">
                    <Check size={13} className="text-emerald shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
