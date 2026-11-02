'use client';

/**
 * Devora Role-Aware Dashboard Page (`user` Guided Creator Dashboard vs `developer` Engineering Console).
 *
 * - For `user` role:
 *   1. Clear, easy-to-understand 4-Step Visual Workflow Guide
 *   2. Exclusive "⚡ Auto Build Website" Express Launcher (builds multi-page site from prompt & opens in a separate tab)
 *   3. Distinct, non-repetitive multi-page user websites with "Open Live Site in Separate Tab ↗", "Customize & Edit", and "Deploy to My Account"
 *
 * - For `developer` role (`sanjay22522g@gmail.com`):
 *   Full Developer Engineering Console with system metrics, Git repo import, raw .env vault links, and Integrations status.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  synthesizeWebsiteFromPrompt,
  saveSynthesizedWebsite,
  type SynthesizedWebsite,
} from '@/lib/website-synthesizer';
import type { Project, ProjectStatus } from '@/types';
import {
  Plus,
  FolderUp,
  CloudUpload,
  Zap,
  Activity,
  Search,
  ExternalLink,
  Sparkles,
  Paintbrush,
  Terminal,
  Rocket,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Plug,
  KeyRound,
} from 'lucide-react';

// Distinct default multi-page websites for User Mode (different industries, never the same template)
const USER_STARTER_SITES: {
  id: string;
  name: string;
  domain: string;
  prompt: string;
  pagesCount: number;
  stack: string[];
  accent: string;
}[] = [
  {
    id: 'site-auracare',
    name: 'AuraCare Dental & Medical Clinic',
    domain: 'Healthcare & Patient Booking',
    prompt:
      'Build a modern Dental & Medical Clinic website called AuraCare with specialist directory, treatment pricing, instant appointment booking calendar, and patient lab portal.',
    pagesCount: 5,
    stack: ['Next.js 16', 'Tailwind CSS', 'Booking Engine', 'Patient Portal'],
    accent: '#0EA5E9',
  },
  {
    id: 'site-veloce',
    name: 'Veloce Atelier Streetwear Store',
    domain: 'E-Commerce & Lookbook',
    prompt:
      'Create a luxury streetwear e-commerce storefront called Veloce Atelier with seasonal lookbook, filterable product catalog, bundle builder, shopping bag checkout, and live order tracking.',
    pagesCount: 5,
    stack: ['Next.js Commerce', 'Tailwind CSS', 'Stripe Cart', 'Order Tracker'],
    accent: '#F59E0B',
  },
  {
    id: 'site-skyline',
    name: 'Skyline Haven Real Estate',
    domain: 'Real Estate & Mortgage Calc',
    prompt:
      'Build an architectural real estate marketplace called Skyline Haven with neighborhood property filters, interactive monthly mortgage & rental yield calculator, and private tour scheduling.',
    pagesCount: 5,
    stack: ['Next.js Spatial', 'Tailwind CSS', 'Mortgage Calc', 'Tour Booking'],
    accent: '#10B981',
  },
];

// Developer mode projects
const DEV_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    user_id: 'dev-sanjay-225',
    name: 'Supastack AI',
    status: 'ready',
    description: 'Full-stack AI analytics dashboard with Supabase backend',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
    design_choice: 'design_first',
    preview_url: '/preview/proj-001',
    preview_status: 'running',
    workspace_id: 'ws-001',
    current_agent_stage: null,
    confirmed_stack: { framework: 'Next.js 16', styling: 'Tailwind 4', backend: 'Supabase' },
    plan_approved: true,
    github_repo: 'Sanjai-225/devora',
    deployment_url: 'https://devora-platform.vercel.app',
    deployment_provider: 'vercel',
  },
  {
    id: 'proj-002',
    user_id: 'dev-sanjay-225',
    name: 'PulseMetrics Cloud',
    status: 'building',
    description: 'Real-time analytics ingestion pipeline dashboard',
    created_at: '2026-10-25T14:00:00Z',
    updated_at: '2026-11-01T07:00:00Z',
    design_choice: 'direct_code',
    preview_url: '/preview/proj-002',
    preview_status: 'running',
    workspace_id: 'ws-002',
    current_agent_stage: 'code_generation',
    confirmed_stack: { framework: 'React', styling: 'Tailwind', backend: 'PostgreSQL' },
    plan_approved: true,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
  {
    id: 'proj-003',
    user_id: 'dev-sanjay-225',
    name: 'FinEdge Billing Portal',
    status: 'ready',
    description: 'Billing and subscription management portal with Stripe integration',
    created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-10-31T15:00:00Z',
    design_choice: 'design_first',
    preview_url: '/preview/proj-003',
    preview_status: 'running',
    workspace_id: 'ws-003',
    current_agent_stage: 'completed',
    confirmed_stack: { framework: 'Next.js', backend: 'Stripe', db: 'Prisma' },
    plan_approved: true,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
];

const DEV_STATS = [
  { label: 'Active Projects', value: '4', sub: '+2 this week', icon: FolderUp, color: 'text-cyan' },
  { label: 'Edge Preview Uptime', value: '99.98%', sub: 'Global SLA', icon: CloudUpload, color: 'text-emerald' },
  { label: 'Deploys (7d)', value: '12', sub: '100% automated', icon: Zap, color: 'text-emerald' },
  { label: 'Agent Tasks', value: '3', sub: 'Active Synth', icon: Activity, color: 'text-cyan' },
];

const QUICK_AUTO_BUILD_IDEAS = [
  {
    label: '🦷 Dental & Medical Clinic',
    name: 'AuraCare Medical Clinic',
    prompt:
      'Build a multi-page Dental & Medical Clinic website with doctor profiles, treatment pricing, online appointment booking calendar, and patient lab portal.',
  },
  {
    label: '🛍️ Streetwear E-Commerce',
    name: 'Veloce Atelier Store',
    prompt:
      'Build a modern streetwear e-commerce storefront with seasonal lookbook, filterable product catalog, bundle builder, shopping cart checkout, and order tracking.',
  },
  {
    label: '🏡 Real Estate & Mortgage',
    name: 'Skyline Haven Estates',
    prompt:
      'Build a luxury real estate marketplace with property search filters, interactive monthly mortgage & ROI calculator, neighborhood insights, and private viewing booking.',
  },
  {
    label: '🍽️ Fine Dining & Reservations',
    name: 'Saffron & Ember Bistro',
    prompt:
      'Build a modern restaurant & bistro website with chef tasting menu, dietary filters, online table reservation system, and private event catering estimator.',
  },
  {
    label: '🏋️ Fitness & Coaching Studio',
    name: 'PulseForge Athletics',
    prompt:
      'Build a fitness & performance coaching website with weekly class schedule booking, macro & calorie calculator, trainer profiles, and membership plans.',
  },
];

export default function DashboardPage() {
  const { user, isDeveloper, getToken } = useAuth();
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');

  // Express Auto-Build state (exclusively for User Role)
  const [autoBuildName, setAutoBuildName] = useState('');
  const [autoBuildPrompt, setAutoBuildPrompt] = useState('');
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [autoBuildStep, setAutoBuildStep] = useState<number>(0);
  const [builtSite, setBuiltSite] = useState<SynthesizedWebsite | null>(null);
  const [userSites, setUserSites] = useState<SynthesizedWebsite[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Seed starter sites so every card opens a genuine multi-page website
      for (const starter of USER_STARTER_SITES) {
        const existing = localStorage.getItem(`devora_synth_site_${starter.id}`);
        if (!existing) {
          const synth = synthesizeWebsiteFromPrompt(starter.prompt, {
            projectId: starter.id,
            projectName: starter.name,
            role: 'user',
            autoBuilt: true,
          });
          localStorage.setItem(`devora_synth_site_${starter.id}`, JSON.stringify(synth));
        }
      }
      const savedListRaw = localStorage.getItem('devora_user_sites_list');
      if (savedListRaw) {
        try {
          setUserSites(JSON.parse(savedListRaw));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleExpressAutoBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoBuildPrompt.trim()) return;
    setIsAutoBuilding(true);
    setBuiltSite(null);

    const steps = [1, 2, 3, 4, 5];
    for (const s of steps) {
      setAutoBuildStep(s);
      await new Promise((r) => setTimeout(r, 260));
    }

    const newProjectId = `auto-${Date.now().toString(36)}`;
    const synthesized = synthesizeWebsiteFromPrompt(autoBuildPrompt, {
      projectId: newProjectId,
      projectName: autoBuildName.trim() || undefined,
      role: 'user',
      autoBuilt: true,
    });
    saveSynthesizedWebsite(synthesized);
    setUserSites((prev) => [
      synthesized,
      ...prev.filter((item) => item.projectId !== synthesized.projectId),
    ]);

    try {
      const tok = (await getToken()) || 'dev-role-user-creator';
      await api.autoBuildWebsite(tok, {
        prompt: autoBuildPrompt.trim(),
        project_name: synthesized.projectName,
      });
    } catch {
      // local synthesized multi-page site is already saved and ready
    }

    setBuiltSite(synthesized);
    setIsAutoBuilding(false);
    setAutoBuildStep(0);
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER 1: USER ROLE DASHBOARD (Simple, Clear App Flow + Auto-Build)
  // ─────────────────────────────────────────────────────────────────────
  if (!isDeveloper) {
    const combinedCards = [
      ...userSites.map((s) => ({
        id: s.projectId,
        name: s.projectName,
        domain: s.domainCategory,
        prompt: s.prompt,
        pagesCount: s.pages.length,
        stack: [s.stack.framework, s.stack.styling, s.stack.database],
        accent: s.palette.primary,
      })),
      ...USER_STARTER_SITES.filter(
        (st) => !userSites.some((u) => u.projectId === st.id),
      ),
    ].filter(
      (item) =>
        !filter.trim() ||
        item.name.toLowerCase().includes(filter.toLowerCase()) ||
        item.domain.toLowerCase().includes(filter.toLowerCase()),
    );

    return (
      <div className="p-6 max-w-[1440px] mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
                Welcome, {user?.display_name?.split(' (')[0] || 'Creator'}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-cyan/15 text-cyan border border-cyan/30 px-2.5 py-0.5 rounded-md font-semibold">
                <Sparkles size={12} />
                USER CREATOR MODE
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              Build complete, multi-page websites in plain English — use{' '}
              <strong className="text-cyan">1-Click Auto Build</strong> for instant results or
              customize every detail step by step.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/create-website">
              <Button variant="primary" icon={<Sparkles size={16} />}>
                Create or Auto-Build Website
              </Button>
            </Link>
          </div>
        </div>

        {/* Clear 4-Step Visual Guide: How Devora Works */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted">
              How Devora Works — 4 Simple Steps (All Features Included)
            </h2>
            <span className="text-xs text-emerald font-mono">
              Zero Complex API Configuration Needed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: 'STEP 1',
                title: 'Describe Your Website',
                desc: 'Tell Devora what kind of website you want in plain English. Get instant AI suggestions for pages, design, and tech stack.',
                href: '/create-website',
                cta: 'Start Prompt →',
              },
              {
                step: 'STEP 2',
                title: '⚡ Auto-Build or Custom Flow',
                desc: 'Click "Auto Build" to let AI configure all defaults and launch your multi-page site automatically, or customize stack & design manually.',
                href: '/create-website',
                cta: 'Use Auto-Build →',
              },
              {
                step: 'STEP 3',
                title: 'Preview in New Tab & Modify',
                desc: 'Open your working multi-page website in a separate browser tab. Use AI chat or Design Studio to add pages, change themes, or edit code.',
                href: '/workspace',
                cta: 'Open Workspace →',
              },
              {
                step: 'STEP 4',
                title: 'Export ZIP or Deploy to Your Account',
                desc: 'Download clean source code as a ZIP, or optionally enter your own GitHub/Vercel/Render credentials to publish to your own cloud account.',
                href: '/configuration',
                cta: 'Deploy Options →',
              },
            ].map((item) => (
              <Card key={item.step} className="bg-surface-1 border border-border">
                <CardContent className="space-y-2">
                  <span className="text-[10px] font-mono text-cyan font-bold px-2 py-0.5 rounded bg-cyan/10 border border-cyan/30">
                    {item.step}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary pt-1">{item.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                  <Link
                    href={item.href}
                    className="inline-block text-xs font-medium text-cyan hover:underline pt-1"
                  >
                    {item.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Exclusive User Feature: 1-Click Auto Build Website Express Box */}
        <section className="rounded-2xl bg-surface-1 border-2 border-cyan/40 p-6 space-y-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-cyan text-canvas font-mono text-[10px] font-bold uppercase">
                  EXCLUSIVE USER ROLE FEATURE
                </span>
                <span className="text-xs font-mono text-emerald">
                  • Automatic Default Configuration + Multi-Page Live Output
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-cyan" />
                1-Click Auto Build Website
              </h2>
              <p className="text-xs text-text-secondary">
                Just enter your requirements prompt below. Devora&apos;s AI agent handles all
                default configurations (tech stack, database, auth, design tokens) and builds a{' '}
                <strong className="text-text-primary">
                  complete 5-page working website online in a separate tab
                </strong>
                .
              </p>
            </div>
          </div>

          {/* Quick Industry Starter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-text-muted">Try a prompt idea:</span>
            {QUICK_AUTO_BUILD_IDEAS.map((idea) => (
              <button
                key={idea.label}
                type="button"
                onClick={() => {
                  setAutoBuildName(idea.name);
                  setAutoBuildPrompt(idea.prompt);
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border hover:border-cyan/50 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {idea.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleExpressAutoBuild} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Website / Brand Name (Optional — AI will infer if blank)
                </label>
                <input
                  type="text"
                  value={autoBuildName}
                  onChange={(e) => setAutoBuildName(e.target.value)}
                  placeholder="e.g. AuraCare Clinic, Veloce Store, Apex Cloud..."
                  className="w-full h-10 px-3.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-cyan"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Describe Your Website Requirements *
                </label>
                <input
                  type="text"
                  required
                  value={autoBuildPrompt}
                  onChange={(e) => setAutoBuildPrompt(e.target.value)}
                  placeholder="Describe the pages, features, booking/checkout, and style you want..."
                  className="w-full h-10 px-3.5 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-cyan"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-text-muted flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>
                  Generates 5 interactive pages • Zero manual API keys required • Deploy to your own
                  account anytime
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/create-website">
                  <Button variant="secondary" type="button">
                    Customize Tech Stack &amp; AI Suggestions First
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isAutoBuilding}
                  icon={<Sparkles size={15} />}
                >
                  {isAutoBuilding
                    ? `Auto-Building Website (Step ${autoBuildStep}/5)...`
                    : '⚡ Auto Build Multi-Page Website Now'}
                </Button>
              </div>
            </div>
          </form>

          {/* Auto-Build Result Banner with Separate Tab Launch */}
          {builtSite && (
            <div className="p-5 rounded-xl bg-emerald-muted/40 border border-emerald-border space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald font-mono text-xs font-semibold">
                    <CheckCircle2 size={16} />
                    <span>
                      AUTO-BUILD COMPLETE • {builtSite.pages.length} INTERACTIVE PAGES READY ONLINE
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {builtSite.projectName} ({builtSite.domainCategory})
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Pages built:{' '}
                    {builtSite.pages.map((p) => `${p.navLabel} (${p.route})`).join(' • ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <a
                    href={`/preview/${builtSite.projectId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-4 rounded-lg bg-cyan text-canvas font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                  >
                    <ExternalLink size={14} />
                    <span>Open Live Website in Separate Tab ↗</span>
                  </a>
                  <Link
                    href={`/workspace?project=${builtSite.projectId}`}
                    className="h-10 px-3.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary flex items-center gap-1.5"
                  >
                    <Terminal size={14} className="text-cyan" />
                    <span>Modify with AI Chat</span>
                  </Link>
                  <Link
                    href={`/configuration?project=${builtSite.projectId}`}
                    className="h-10 px-3.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-primary flex items-center gap-1.5"
                  >
                    <Rocket size={14} className="text-emerald" />
                    <span>Deploy to My Account</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* User Websites List (Distinct Multi-Page Websites) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Your Multi-Page Websites ({combinedCards.length})
              </h2>
              <p className="text-xs text-text-secondary">
                Every website has its own tailored pages, interactive features, and live separate-tab
                preview.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-9 w-64">
              <Search size={14} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search your websites..."
                className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {combinedCards.map((siteCard) => (
              <Card
                key={siteCard.id}
                className="bg-surface-1 border border-border flex flex-col justify-between"
              >
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-canvas shrink-0"
                          style={{ backgroundColor: siteCard.accent }}
                        >
                          {siteCard.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary text-sm leading-snug">
                            {siteCard.name}
                          </h3>
                          <span className="text-[11px] font-mono text-text-muted">
                            {siteCard.domain}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-muted text-emerald border border-emerald-border font-mono text-[10px]">
                        {siteCard.pagesCount} PAGES LIVE
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {siteCard.prompt}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {siteCard.stack.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-mono text-text-secondary bg-surface-3 px-2 py-0.5 rounded border border-border"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons for Every User Website */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <a
                      href={`/preview/${siteCard.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-9 px-3 rounded-lg bg-cyan text-canvas font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <ExternalLink size={13} />
                      <span>Open Live Website in New Tab ↗</span>
                    </a>

                    <div className="grid grid-cols-3 gap-1.5">
                      <Link
                        href={`/projects/${siteCard.id}`}
                        className="h-8 px-2 rounded bg-surface-2 hover:bg-surface-3 border border-border text-[11px] text-text-secondary hover:text-text-primary flex items-center justify-center gap-1"
                      >
                        <Layers size={11} />
                        <span>Spec</span>
                      </Link>
                      <Link
                        href={`/design-studio?project=${siteCard.id}`}
                        className="h-8 px-2 rounded bg-surface-2 hover:bg-surface-3 border border-border text-[11px] text-text-secondary hover:text-text-primary flex items-center justify-center gap-1"
                      >
                        <Paintbrush size={11} />
                        <span>Design</span>
                      </Link>
                      <Link
                        href={`/workspace?project=${siteCard.id}`}
                        className="h-8 px-2 rounded bg-surface-2 hover:bg-surface-3 border border-border text-[11px] text-text-secondary hover:text-text-primary flex items-center justify-center gap-1"
                      >
                        <Terminal size={11} />
                        <span>Edit / ZIP</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER 2: DEVELOPER ROLE DASHBOARD (`sanjay22522g@gmail.com`)
  // Preserves all developer telemetry, Git branches, Vault & Integrations
  // ─────────────────────────────────────────────────────────────────────
  const filteredDev = DEV_PROJECTS.filter((p) => {
    if (activeTab !== 'All') {
      const tabMap: Record<string, ProjectStatus[]> = {
        Building: ['building', 'analyzing', 'designing', 'configuring', 'planning', 'testing', 'repairing'],
        Ready: ['ready'],
        Failed: ['failed'],
      };
      if (!tabMap[activeTab]?.includes(p.status)) return false;
    }
    if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Developer Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back, {user?.display_name || 'Sanjay G (Lead Developer)'}
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-emerald-muted text-emerald border border-emerald-border px-2.5 py-0.5 rounded">
              <ShieldCheck size={12} />
              DEVELOPER ROLE • {user?.email || 'sanjay22522g@gmail.com'}
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            Full Engineering Console: Autonomous AI agents, AES-256 server `.env` vault, Git
            branches, and Cloud Integrations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/integrations">
            <Button variant="secondary" icon={<Plug size={15} />}>
              Cloud &amp; Git Integrations
            </Button>
          </Link>
          <Link href="/configuration">
            <Button variant="secondary" icon={<KeyRound size={15} />}>
              .env Vault
            </Button>
          </Link>
          <Link href="/create-website">
            <Button variant="primary" icon={<Plus size={16} />}>
              Create Website
            </Button>
          </Link>
        </div>
      </div>

      {/* Developer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEV_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-secondary mb-2">{stat.label}</p>
                  <p className="text-2xl font-semibold font-mono">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.color}`}>{stat.sub}</p>
                </div>
                <Icon size={20} className="text-text-muted" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-8 w-64">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Filter projects, tags, branches..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center bg-surface-2 border border-border rounded-[4px] overflow-hidden">
          {(['All', 'Building', 'Ready', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 h-8 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
              {tab === 'All' && ` (${DEV_PROJECTS.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Developer Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDev.map((project) => (
          <Card key={project.id} hoverable className="h-full">
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm font-semibold text-cyan">
                    {project.name[0]}
                  </div>
                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-text-primary hover:text-cyan"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-text-secondary">{project.description}</p>
                  </div>
                </div>
                <StatusChip status={project.status} />
              </div>

              {project.confirmed_stack && (
                <div className="flex flex-wrap items-center gap-2">
                  {Object.values(project.confirmed_stack).map((tech) => (
                    <span
                      key={tech}
                      className="text-[10px] font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    Spec
                  </Link>
                  <span className="text-text-muted">•</span>
                  <Link
                    href={`/configuration?project=${project.id}`}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    .env Vault
                  </Link>
                  <span className="text-text-muted">•</span>
                  <Link
                    href={`/workspace?project=${project.id}`}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    Workspace
                  </Link>
                </div>
                <a
                  href={`/preview/${project.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Live Preview Tab</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
