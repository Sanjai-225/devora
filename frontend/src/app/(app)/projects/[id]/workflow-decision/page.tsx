'use client';

/**
 * Devora Workflow Decision Page (Phase 3 — Step 2 of 4).
 * Matches Stitch `devora_workflow_decision` (Obsidian Cyan Precision) design.
 * Allows the user to choose between:
 *  - Path A: Design Studio First (`design_first`) -> /projects/[id]/design-studio
 *  - Path B: Direct Code Synthesis (`direct_code`) -> /workspace?project=[id]
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Layers,
  Palette,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';

export default function WorkflowDecisionPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const projectId = params?.id || 'proj-001';

  const [selectedChoice, setSelectedChoice] = useState<'design_first' | 'direct_code'>(
    'design_first',
  );
  const [projectName, setProjectName] = useState<string>('Novastride Fleet');
  const [routeCount, setRouteCount] = useState<number>(4);
  const [featureCount, setFeatureCount] = useState<number>(3);
  const [stackLabel, setStackLabel] = useState<string>('Next.js 16 + Tailwind v4');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function loadProjectMeta() {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(`devora_project_${projectId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (active && parsed.name) setProjectName(parsed.name);
          } catch {
            // ignore
          }
        }
      }

      try {
        const tok = (await getToken()) || 'dev-token';
        const state = await api.getAgentState(tok, projectId);
        if (!active) return;
        if (state.requirements) {
          setProjectName(state.requirements.project_name || 'Novastride Fleet');
          setRouteCount(state.requirements.pages?.length || 4);
          setFeatureCount(state.requirements.features?.length || 3);
          const fw = state.requirements.technology_stack?.framework || 'nextjs';
          const st = state.requirements.technology_stack?.styling || 'tailwind';
          setStackLabel(`${fw.toUpperCase()} + ${st.toUpperCase()}`);
        }
        if (
          state.design_choice === 'design_first' ||
          state.design_choice === 'direct_code'
        ) {
          setSelectedChoice(state.design_choice);
        }
      } catch {
        // Fallback defaults remain active in offline/static mode
      }
    }
    loadProjectMeta();
    return () => {
      active = false;
    };
  }, [projectId, getToken]);

  const handleConfirmChoice = async (
    explicitChoice?: 'design_first' | 'direct_code',
  ) => {
    const choice = explicitChoice || selectedChoice;
    setSelectedChoice(choice);
    setIsSubmitting(true);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`devora_design_choice_${projectId}`, choice);
    }

    try {
      const tok = (await getToken()) || 'dev-token';
      await api.setDesignChoice(tok, projectId, choice);
    } catch {
      // Offline mode fallback
    } finally {
      setIsSubmitting(false);
      if (choice === 'design_first') {
        router.push(`/projects/${projectId}/design-studio`);
      } else {
        router.push(`/workspace?project=${projectId}`);
      }
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 relative">
      {/* Top Pipeline Stepper & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-xs text-text-secondary">
            <Link href="/projects" className="hover:text-text-primary transition-colors">
              Projects
            </Link>
            <span className="text-text-muted">/</span>
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-text-primary transition-colors"
            >
              {projectName}
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-cyan font-medium">Workflow Decision</span>
          </nav>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight">
            Select Synthesis Pipeline
          </h1>
        </div>

        {/* 4-Step Pipeline Indicator matching Stitch devora_workflow_decision */}
        <div className="flex items-center gap-2 text-xs font-mono bg-surface-1 px-3.5 py-2 rounded-lg border border-border">
          <span className="flex items-center gap-1.5 text-emerald">
            <CheckCircle2 size={13} />
            <span>1. Requirements</span>
          </span>
          <span className="text-text-muted">→</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-muted border border-cyan-border text-cyan font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            <span>2. Workflow Path</span>
          </span>
          <span className="text-text-muted">→</span>
          <span className="text-text-muted">3. Architecture</span>
          <span className="text-text-muted">→</span>
          <span className="text-text-muted">4. Live Build</span>
        </div>
      </div>

      {/* Requirement Analysis Complete Context Banner */}
      <div className="rounded-lg bg-surface-1 border border-border p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-emerald-muted border border-emerald-border flex items-center justify-center text-emerald shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Requirement Analysis Complete
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-3 text-cyan border border-border">
                {projectName}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Synthesized {routeCount} application routes, {featureCount} core feature blueprints, and verified{' '}
              <span className="font-mono text-text-primary">{stackLabel}</span>.
            </p>
          </div>
        </div>
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-mono text-text-secondary hover:text-cyan transition-colors flex items-center gap-1.5 shrink-0"
        >
          <span>Inspect Spec</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Section Intro */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <p className="text-sm text-text-secondary leading-relaxed">
          Choose how Devora should materialize your application. Generate an interactive visual prototype to refine tokens and layout first, or compile directly into full-stack production source code.
        </p>
      </div>

      {/* Dual Comparison Cards Grid (Matches Stitch devora_workflow_decision) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* CARD A: Design Studio First (Recommended) */}
        <div
          onClick={() => setSelectedChoice('design_first')}
          className={`rounded-xl p-6 flex flex-col justify-between cursor-pointer transition-all relative ${
            selectedChoice === 'design_first'
              ? 'bg-gradient-to-b from-cyan/[0.06] to-surface-1 border-2 border-cyan shadow-[0_0_32px_rgba(0,240,255,0.12)]'
              : 'bg-surface-1 border border-border hover:border-border-hover'
          }`}
        >
          <div>
            {/* Card Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-muted border border-cyan-border flex items-center justify-center text-cyan">
                  <Palette size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">
                      Design Studio First
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-muted text-cyan border border-cyan-border">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Interactive Sandpack UI prototype &amp; live token editor before code build
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  selectedChoice === 'design_first'
                    ? 'border-cyan bg-cyan text-[#080A0D]'
                    : 'border-border bg-surface-2'
                }`}
              >
                {selectedChoice === 'design_first' && <Check size={12} strokeWidth={3} />}
              </div>
            </div>

            {/* Embedded Wireframe Mockup Preview */}
            <div className="rounded-lg bg-canvas border border-border p-3.5 mb-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red/70" />
                  <span className="w-2 h-2 rounded-full bg-amber/70" />
                  <span className="w-2 h-2 rounded-full bg-emerald/70" />
                  <span className="text-[10px] font-mono text-text-muted ml-2">
                    design-studio://canvas-v1.0
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-muted text-cyan font-mono text-[10px] border border-cyan-border">
                    1440px
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-2 text-text-muted font-mono text-[10px]">
                    768px
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-2 text-text-muted font-mono text-[10px]">
                    390px
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2.5 h-32">
                <div className="col-span-4 rounded bg-surface-1 border border-border p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-cyan uppercase">
                    Design Tokens
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-cyan border border-white/20" />
                      <span className="text-[10px] font-mono text-text-secondary">#00F0FF</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-indigo border border-white/20" />
                      <span className="text-[10px] font-mono text-text-secondary">#6366F1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald border border-white/20" />
                      <span className="text-[10px] font-mono text-text-secondary">#10B981</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted">Geist • 8px radius</span>
                </div>

                <div className="col-span-8 rounded bg-surface-1 border border-cyan/40 p-2.5 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-20 rounded bg-cyan/40" />
                    <div className="h-4 px-1.5 rounded bg-cyan text-[#080A0D] font-mono text-[9px] font-bold flex items-center">
                      Inspect Element
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 my-auto">
                    <div className="h-12 rounded bg-surface-2 border border-border" />
                    <div className="h-12 rounded bg-cyan-muted border border-cyan" />
                    <div className="h-12 rounded bg-surface-2 border border-border" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-text-muted">
                    <span>Sandpack Hot-Reload</span>
                    <span className="text-emerald">● Live Preview</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Checklist */}
            <ul className="space-y-2.5 text-xs text-text-secondary mb-6">
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Interactive React Prototype:
                  </strong>{' '}
                  Test responsive Desktop (1440px), Tablet (768px), and Mobile (390px) viewports in real time.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Natural Language &amp; Token Iteration:
                  </strong>{' '}
                  Modify color palettes, typography scales, and component density via AI chat.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Version History &amp; Rollback:
                  </strong>{' '}
                  Compare design iterations (v1.0, v1.1, v1.2) and lock in the approved specification.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-cyan" />
                <span>Est. Prototype Time: ~45 seconds</span>
              </span>
              <span className="text-cyan">Visual Verification Enabled</span>
            </div>

            <Button
              variant="primary"
              className="w-full justify-between"
              loading={isSubmitting && selectedChoice === 'design_first'}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmChoice('design_first');
              }}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={15} />
                <span>Launch Design Studio</span>
              </span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* CARD B: Direct Code Synthesis */}
        <div
          onClick={() => setSelectedChoice('direct_code')}
          className={`rounded-xl p-6 flex flex-col justify-between cursor-pointer transition-all relative ${
            selectedChoice === 'direct_code'
              ? 'bg-gradient-to-b from-indigo/[0.08] to-surface-1 border-2 border-indigo shadow-[0_0_32px_rgba(99,102,241,0.16)]'
              : 'bg-surface-1 border border-border hover:border-border-hover'
          }`}
        >
          <div>
            {/* Card Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo/10 border border-indigo/30 flex items-center justify-center text-indigo">
                  <Terminal size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">
                      Direct Code Synthesis
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo/10 text-indigo border border-indigo/30">
                      Fastest Path
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Skip visual prototyping &amp; compile straight to full-stack repository
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  selectedChoice === 'direct_code'
                    ? 'border-indigo bg-indigo text-white'
                    : 'border-border bg-surface-2'
                }`}
              >
                {selectedChoice === 'direct_code' && <Check size={12} strokeWidth={3} />}
              </div>
            </div>

            {/* Embedded Terminal & File Tree Mockup Preview */}
            <div className="rounded-lg bg-canvas border border-border p-3.5 mb-5 font-mono text-[11px]">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Code2 size={12} className="text-indigo" />
                  <span>devora-agent://code-synthesis</span>
                </span>
                <span className="text-[10px] text-emerald">AST Compiler Ready</span>
              </div>

              <div className="space-y-1.5 text-text-secondary h-32 overflow-hidden">
                <div>
                  <span className="text-emerald">✔</span> scaffolding{' '}
                  <span className="text-text-primary">src/app/(dashboard)/page.tsx</span>
                </div>
                <div>
                  <span className="text-emerald">✔</span> generating API handlers{' '}
                  <span className="text-text-primary">src/app/api/telemetry/route.ts</span>
                </div>
                <div>
                  <span className="text-emerald">✔</span> applying Obsidian Cyan Precision design tokens
                </div>
                <div>
                  <span className="text-indigo">▸</span> executing Playwright E2E verification suite...
                </div>
                <div className="pt-1 text-[10px] text-text-muted">
                  14 files generated • 0 TypeScript errors • Git checkpoint committed
                </div>
              </div>
            </div>

            {/* Feature Checklist */}
            <ul className="space-y-2.5 text-xs text-text-secondary mb-6">
              <li className="flex items-start gap-2.5">
                <Zap size={14} className="text-indigo shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Immediate Repository Scaffolding:
                  </strong>{' '}
                  Generates production Next.js routes, API endpoints, and database schemas in one pass.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Layers size={14} className="text-indigo shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Automatic Design Defaults:
                  </strong>{' '}
                  Uses the project&apos;s inferred color scheme and component system without manual design review.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Cpu size={14} className="text-indigo shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text-primary font-medium">
                    Full IDE &amp; Terminal Access:
                  </strong>{' '}
                  Jump straight into the live code workspace, file tree, and chat-driven code edits.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-indigo" />
                <span>Saves ~2–3 mins of review</span>
              </span>
              <span className="text-indigo">Direct to Code Workspace</span>
            </div>

            <Button
              variant="secondary"
              className="w-full justify-between border-indigo/40 hover:border-indigo text-text-primary"
              loading={isSubmitting && selectedChoice === 'direct_code'}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmChoice('direct_code');
              }}
            >
              <span className="flex items-center gap-2">
                <Terminal size={15} className="text-indigo" />
                <span>Skip Design &amp; Build Code Directly</span>
              </span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Requirement Synthesis</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">
            Selected Path:{' '}
            <strong className="text-cyan">
              {selectedChoice === 'design_first'
                ? 'Design Studio First'
                : 'Direct Code Synthesis'}
            </strong>
          </span>
          <Button
            variant="primary"
            size="sm"
            loading={isSubmitting}
            onClick={() => handleConfirmChoice()}
          >
            <span>Continue with Selected Workflow</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
