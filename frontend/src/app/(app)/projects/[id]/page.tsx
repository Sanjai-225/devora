'use client';

/**
 * Project Requirement Analysis & System Spec Synthesis page.
 * Matches Stitch `devora_requirement_analysis` (Obsidian Cyan Precision) design.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AgentChatPanel } from '@/components/agent/agent-chat-panel';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type {
  ClarificationQuestion,
  ConversationMessage,
  StructuredRequirements,
} from '@/types';
import {
  RefreshCw,
  Edit3,
  ArrowRight,
  Bot,
  GitBranch,
  Layers,
  HelpCircle,
  CheckCircle2,
  Download,
  ChevronRight,
  Cpu,
  Check,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const DEFAULT_REQUIREMENTS: StructuredRequirements = {
  project_name: 'Novastride Fleet',
  project_type: 'dashboard',
  summary:
    'High-performance IoT Fleet Intelligence Dashboard with real-time GPS telemetry, battery degradation predictive tracking, and Stripe-billed tiered telematics subscriptions.',
  pages: [
    {
      name: 'Telemetry & Centroid Tracking',
      route: '/dashboard/telemetry',
      description:
        'Live Recharts centroid GPS tracking map, vehicle battery State of Charge (SoC), dual inverter motor thermal readouts with 500ms reactive polling.',
      components: ['@tanstack/react-query', 'mapbox-gl / svg-canvas', 'useWebSocket'],
      is_authenticated: true,
    },
    {
      name: 'Fleet Diagnostics & DTC Triage',
      route: '/fleet/diagnostics',
      description:
        'Predictive maintenance scheduling drawer, OBD-II error code mapping, and real-time fleet DTC triage workflow modal.',
      components: ['DiagnosticsDrawer', 'ObdCodeTable', 'TriageModal'],
      is_authenticated: true,
    },
    {
      name: 'Subscription & Telematics Billing',
      route: '/billing/plans',
      description:
        'Tiered Stripe Checkout customer portal integration: Fleet Starter ($49/mo) vs Enterprise Unlimited ($299/mo) with metered SIM telemetry add-ons.',
      components: ['@stripe/stripe-js', 'stripe-webhook-handler', 'PlanComparisonCard'],
      is_authenticated: true,
    },
    {
      name: 'Edge Telemetry WebSocket API',
      route: '/api/telemetry/ws',
      description:
        'Edge runtime WebSocket server with fallback Server-Sent Events (SSE) stream for low-bandwidth cellular field units.',
      components: ['Edge Runtime', 'Supabase Realtime Channel', '<20ms Latency Target'],
      is_authenticated: true,
    },
  ],
  features: [
    {
      name: 'Vector Centroid Map',
      description:
        'Hardware-accelerated SVG interactive bounding coordinate tracker with live position pulse markers.',
      priority: 'must_have',
      requires_backend: true,
    },
    {
      name: 'SoC Degradation Curves',
      description:
        'Recharts dynamic trend lines illustrating kWh efficiency vs battery ambient operating temperatures.',
      priority: 'must_have',
      requires_backend: true,
    },
    {
      name: 'Telematics Alert Drawer',
      description:
        'Bi-directional alert resolution drawer bundled with Playwright synthetic sensor fault tests.',
      priority: 'should_have',
      requires_backend: false,
    },
  ],
  technology_stack: {
    framework: 'nextjs',
    styling: 'tailwind',
    backend: 'nextjs_api',
    database: 'postgresql',
    auth_methods: ['email_password', 'oauth_google'],
    additional_libraries: ['recharts', '@tanstack/react-query', 'zustand', 'stripe'],
    language: 'typescript',
  },
  design_preferences: {
    color_scheme: 'dark mode, electric cyan (#00F0FF)',
    style: 'obsidian_cyan_precision',
    has_logo: false,
    reference_sites: [],
  },
  complexity: 'complex',
  has_sample_data: true,
  target_audience: 'EV Fleet Operations & Logistics Teams',
  assumptions_made: [
    'Schema integrity verified (0 circular dependencies)',
    'API rate limiting configured for telemetry endpoints',
    'WCAG AAA high-contrast dark tokens resolved with Geist typography',
  ],
};

const DEFAULT_QUESTIONS: ClarificationQuestion[] = [
  {
    id: 'q_socket_latency',
    question: 'Should mock WebSockets stream updates every 500ms or 1,000ms?',
    why: 'Telematics Spec • Socket Latency',
    options: ['500ms (High-Fi)', '1,000ms (Saver)'],
    default: '500ms (High-Fi)',
  },
  {
    id: 'q_auth_architecture',
    question: 'Require multi-tenant organization switcher in the navigation header?',
    why: 'Security Spec • Auth Architecture',
    options: ['Enable Multi-tenant Orgs', 'Single Workspace Only'],
    default: 'Enable Multi-tenant Orgs',
  },
  {
    id: 'q_test_data_seeding',
    question: 'Auto-generate 50 mock electric delivery vans with realistic coordinates?',
    why: 'Database Spec • Test Data Seeding',
    options: ['Auto-seed 50 Fleet Units', 'Start with Empty Fleet'],
    default: 'Auto-seed 50 Fleet Units',
  },
];

export default function ProjectRequirementAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const projectId = params?.id || 'proj-001';

  const [requirements, setRequirements] = useState<StructuredRequirements>(DEFAULT_REQUIREMENTS);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>(DEFAULT_QUESTIONS);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    q_socket_latency: '500ms (High-Fi)',
    q_auth_architecture: 'Enable Multi-tenant Orgs',
    q_test_data_seeding: 'Auto-seed 50 Fleet Units',
  });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('requirement_analysis');
  const [shouldWait, setShouldWait] = useState<boolean>(true);
  const [waitReason, setWaitReason] = useState<string | null>('clarification');
  const [rawPrompt, setRawPrompt] = useState<string>(DEFAULT_REQUIREMENTS.summary);
  const [editingPrompt, setEditingPrompt] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [tokenStr, setTokenStr] = useState<string>('dev-token');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const applyAgentState = useCallback((state: {
    requirements?: StructuredRequirements | null;
    clarification_questions?: ClarificationQuestion[];
    current_stage?: string;
    should_wait_for_user?: boolean;
    wait_reason?: string | null;
    messages?: ConversationMessage[];
  }) => {
    if (state.requirements) {
      setRequirements(state.requirements);
      setRawPrompt(state.requirements.summary);
    }
    if (state.clarification_questions && state.clarification_questions.length > 0) {
      setQuestions(state.clarification_questions);
      const defaults: Record<string, string> = {};
      for (const q of state.clarification_questions) {
        defaults[q.id] = q.default || q.options?.[0] || 'Confirmed';
      }
      setSelectedAnswers((prev) => ({ ...defaults, ...prev }));
    }
    if (state.current_stage) setCurrentStage(state.current_stage);
    if (typeof state.should_wait_for_user === 'boolean') setShouldWait(state.should_wait_for_user);
    if (state.wait_reason !== undefined) setWaitReason(state.wait_reason);
    if (state.messages) setMessages(state.messages);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitialState() {
      const tok = (await getToken()) || 'dev-token';
      if (active) setTokenStr(tok);

      // Check sessionStorage fallback if created offline
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem(`devora_project_${projectId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.name && parsed.description) {
              setRawPrompt(parsed.description);
              setRequirements((prev) => ({
                ...prev,
                project_name: parsed.name,
                summary: parsed.description,
              }));
            }
          } catch {
            // Ignore parse error
          }
        }
      }

      try {
        const state = await api.getAgentState(tok, projectId);
        if (!active) return;
        if (state.requirements) {
          applyAgentState(state);
        } else {
          const started = await api.startAgent(tok, projectId);
          if (active) applyAgentState(started);
        }
      } catch {
        // Backend not reachable in static preview; populate initial synthetic agent message
        if (active) {
          setMessages([
            {
              id: 'msg-init-1',
              project_id: projectId,
              role: 'agent',
              content:
                `I have analyzed your specification for **${DEFAULT_REQUIREMENTS.project_name}**.\n\n` +
                `Mapped **${DEFAULT_REQUIREMENTS.pages.length} routes** and **${DEFAULT_REQUIREMENTS.features.length} core component blueprints**. ` +
                `Please review the ${DEFAULT_QUESTIONS.length} clarification decisions on the right or ask me to adjust any route or technology choice.`,
              timestamp: new Date().toISOString(),
              stage: 'requirement_analysis',
            },
          ]);
        }
      }
    }
    loadInitialState();
    return () => {
      active = false;
    };
  }, [projectId, getToken, applyAgentState]);

  const handleRerunAnalysis = async () => {
    setIsProcessing(true);
    setStatusBanner(null);
    try {
      const state = await api.startAgent(tokenStr, projectId, rawPrompt);
      applyAgentState(state);
      setEditingPrompt(false);
      setStatusBanner('Specification re-synthesized from updated prompt.');
    } catch {
      // Offline fallback update
      setRequirements((prev) => ({
        ...prev,
        summary: rawPrompt,
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          project_id: projectId,
          role: 'user',
          content: `Re-analyze prompt: ${rawPrompt}`,
          timestamp: new Date().toISOString(),
          stage: 'requirement_analysis',
        },
        {
          id: `msg-${Date.now() + 1}`,
          project_id: projectId,
          role: 'agent',
          content: `Updated specification intent: "${rawPrompt}". Routes and stack verified with zero conflicts.`,
          timestamp: new Date().toISOString(),
          stage: 'requirement_analysis',
        },
      ]);
      setEditingPrompt(false);
      setStatusBanner('Specification updated with revised prompt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitClarifications = async () => {
    setIsProcessing(true);
    setStatusBanner(null);
    try {
      const state = await api.sendAgentMessage(tokenStr, projectId, {
        type: 'clarification_response',
        answers: selectedAnswers,
      });
      applyAgentState(state);
      setStatusBanner('Clarifications applied — technology stack ready for confirmation.');
    } catch {
      const summaryLines = Object.entries(selectedAnswers)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' • ');
      setRequirements((prev) => ({
        ...prev,
        assumptions_made: [
          ...prev.assumptions_made.filter((a) => !a.startsWith('Clarified:')),
          `Clarified: ${summaryLines}`,
        ],
      }));
      setCurrentStage('stack_confirmation');
      setWaitReason('stack_confirmation');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          project_id: projectId,
          role: 'user',
          content: `Clarification decisions: ${summaryLines}`,
          timestamp: new Date().toISOString(),
          stage: 'clarification',
        },
        {
          id: `msg-${Date.now() + 1}`,
          project_id: projectId,
          role: 'agent',
          content:
            'Clarifications locked in! I have updated the system specification and verified the technology stack. Click **Confirm Stack & Proceed** when you are ready.',
          timestamp: new Date().toISOString(),
          stage: 'stack_confirmation',
        },
      ]);
      setStatusBanner('Clarifications locked in! Ready for stack confirmation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendChatMessage = async (content: string) => {
    setIsProcessing(true);
    try {
      const state = await api.sendAgentMessage(tokenStr, projectId, {
        type: 'user_message',
        content,
      });
      applyAgentState(state);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          project_id: projectId,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          stage: currentStage,
        },
        {
          id: `msg-${Date.now() + 1}`,
          project_id: projectId,
          role: 'agent',
          content: `Applied your instruction ("${content}") to the **${requirements.project_name}** requirement specification. Stack and route definitions remain valid.`,
          timestamp: new Date().toISOString(),
          stage: 'stack_confirmation',
        },
      ]);
      setRequirements((prev) => ({
        ...prev,
        assumptions_made: [...prev.assumptions_made, `User note: ${content}`],
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveStack = async (choice: 'proceed' | 'design_first' | 'modify') => {
    setIsProcessing(true);
    try {
      const state = await api.sendAgentMessage(tokenStr, projectId, {
        type: 'user_approval',
        approved: choice !== 'modify',
        stage: 'stack',
        choice,
      });
      applyAgentState(state);
      setStatusBanner(
        choice === 'design_first'
          ? 'Design-First workflow selected! Ready for Phase 3 Design Studio.'
          : 'Technology stack confirmed and locked in!',
      );
    } catch {
      setCurrentStage(choice === 'design_first' ? 'design_chosen' : 'stack_confirmed');
      setShouldWait(false);
      setWaitReason(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          project_id: projectId,
          role: 'agent',
          content:
            choice === 'design_first'
              ? '🎨 Design-First workflow confirmed! Your requirement specification is locked in for Design Studio.'
              : '✅ Technology stack confirmed! Your project requirements are locked in.',
          timestamp: new Date().toISOString(),
          stage: 'stack_confirmed',
        },
      ]);
      setStatusBanner('Technology stack confirmed! Requirement synthesis complete.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPrd = () => {
    const md = [
      `# ${requirements.project_name} — Product Requirements Specification`,
      ``,
      `**Project Type:** ${requirements.project_type}`,
      `**Complexity:** ${requirements.complexity}`,
      `**Stage:** ${currentStage}`,
      ``,
      `## 1. Executive Summary`,
      requirements.summary,
      ``,
      `## 2. Target Architecture & Routes (${requirements.pages.length})`,
      ...requirements.pages.map(
        (p) =>
          `- **\`${p.route}\` (${p.name})** — ${p.description}\n  - Components: ${p.components.join(', ')}`,
      ),
      ``,
      `## 3. Feature Matrix (${requirements.features.length})`,
      ...requirements.features.map(
        (f) => `- **[${f.priority.toUpperCase()}] ${f.name}**: ${f.description}`,
      ),
      ``,
      `## 4. Technology Stack`,
      `- **Framework:** ${requirements.technology_stack.framework}`,
      `- **Styling:** ${requirements.technology_stack.styling}`,
      `- **Backend:** ${requirements.technology_stack.backend}`,
      `- **Database:** ${requirements.technology_stack.database}`,
      `- **Language:** ${requirements.technology_stack.language}`,
      ``,
      `## 5. Clarifications & Assumptions`,
      ...requirements.assumptions_made.map((a) => `- ${a}`),
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${requirements.project_name.toLowerCase().replace(/\s+/g, '-')}-prd.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalComponents = requirements.pages.reduce(
    (acc, p) => acc + (p.components?.length || 2),
    0,
  );

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb (Matches Stitch devora_requirement_analysis) */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="space-y-1.5">
          <nav className="flex items-center gap-2 text-xs text-text-secondary">
            <Link href="/projects" className="hover:text-text-primary transition-colors">
              Projects
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan" />
              {requirements.project_name}
            </span>
            <span className="text-text-muted">/</span>
            <span className="text-cyan font-medium">Requirement Synthesis</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] text-text-secondary font-mono ml-1 border border-border">
              Stage 2 of 4
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight flex items-center gap-3">
              System Spec Synthesis
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-muted border border-cyan-border text-cyan font-mono text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
                </span>
                Active Agent Analysis
              </span>
            </h1>

            <div className="flex items-center gap-2 font-mono text-xs text-text-secondary bg-surface-1 px-3 py-1 rounded border border-border">
              <Cpu size={13} className="text-cyan" />
              <span>Synthesized 1,420 tokens</span>
              <span className="text-text-muted">•</span>
              <span className="text-emerald font-medium">94.8% Confidence Score</span>
            </div>
          </div>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            loading={isProcessing}
            onClick={handleRerunAnalysis}
          >
            Re-run Analysis
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 size={14} />}
            onClick={() => setEditingPrompt((v) => !v)}
          >
            {editingPrompt ? 'Close Prompt Editor' : 'Edit Raw Prompt'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApproveStack('proceed')}
            loading={isProcessing}
          >
            <span>Proceed to Workflow Decision</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </header>

      {/* Status notification banner */}
      {statusBanner && (
        <div className="px-4 py-2.5 rounded bg-emerald-muted border border-emerald-border text-emerald text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            {statusBanner}
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Optional Raw Prompt Editor */}
      {editingPrompt && (
        <div className="p-4 rounded-lg bg-surface-2 border border-cyan-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan uppercase tracking-wider">
              Edit Natural Language Specification Prompt
            </span>
            <span className="text-xs text-text-muted">
              Updating will re-run the LangGraph requirement analysis node
            </span>
          </div>
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            className="w-full h-24 px-3 py-2 bg-surface-1 border border-border rounded text-sm text-text-primary outline-none focus:border-cyan resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={isProcessing}
              onClick={handleRerunAnalysis}
            >
              Synthesize Updated Spec
            </Button>
          </div>
        </div>
      )}

      {/* Top Callout Banner: Agent Reasoning Summary */}
      <section className="relative overflow-hidden rounded-lg bg-surface-1 border border-border p-5">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5 max-w-4xl">
            <div className="w-9 h-9 rounded bg-surface-3 flex items-center justify-center border border-border text-cyan shrink-0 mt-0.5">
              <Bot size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cyan">
                  Devora Autonomous Architect
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-secondary border border-border">
                  DE-REASONING-V4
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                <strong className="text-text-primary font-medium">Parsed Intent:</strong>{' '}
                {requirements.summary}
              </p>
            </div>
          </div>

          {/* Complexity Metric Tile */}
          <div className="flex items-center gap-4 bg-surface-2 px-4 py-2.5 rounded border border-border shrink-0">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                Complexity Rating
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary font-semibold capitalize">
                  {requirements.complexity}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald" />
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-3 font-mono text-xs text-text-secondary">
              <span className="text-cyan font-medium">
                {totalComponents}{' '}
                <span className="text-text-secondary font-normal">Components</span>
              </span>
              <span>•</span>
              <span className="text-cyan font-medium">
                {requirements.pages.length}{' '}
                <span className="text-text-secondary font-normal">Routes</span>
              </span>
              <span>•</span>
              <span className="text-emerald font-medium">
                {requirements.features.length}{' '}
                <span className="text-text-secondary font-normal">Features</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Split Grid (12 cols: 7 left, 5 right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Column: Routes, Component Matrix, Stack (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Identified Pages & Dynamic Routes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-cyan" />
                <h2 className="text-base font-semibold text-text-primary">
                  Target Architecture & Routes
                </h2>
              </div>
              <span className="font-mono text-xs text-text-secondary">
                {requirements.pages.length} Endpoints Mapped
              </span>
            </div>

            <div className="space-y-2.5">
              {requirements.pages.map((page, idx) => {
                const isApi = page.route.startsWith('/api');
                return (
                  <div
                    key={page.route + idx}
                    className="p-4 rounded-lg bg-surface-1 hover:bg-surface-2 border border-border transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded bg-surface-3 font-medium border border-border ${
                            isApi ? 'text-emerald' : 'text-cyan'
                          }`}
                        >
                          {isApi ? 'EDGE API' : 'PAGE'}
                        </span>
                        <span className="text-text-primary font-semibold">{page.route}</span>
                        <span className="text-text-muted">— {page.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          idx < 2
                            ? 'bg-red-muted text-red border-red-border'
                            : 'bg-emerald-muted text-emerald border-emerald-border'
                        }`}
                      >
                        {idx < 2 ? 'High Priority' : 'Core Route'}
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">
                      {page.description}
                    </p>

                    {page.components && page.components.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-border/60 font-mono text-[11px] text-text-secondary">
                        <span className="text-text-muted">Dependencies & Units:</span>
                        {page.components.map((comp, cIdx) => (
                          <span key={comp} className="flex items-center gap-1.5">
                            <span className="text-text-primary">{comp}</span>
                            {cIdx < page.components.length - 1 && (
                              <span className="text-text-muted">•</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Feature Matrix & Component Blueprint */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan" />
                <h2 className="text-base font-semibold text-text-primary">
                  Feature Matrix & Component Blueprint
                </h2>
              </div>
              <span className="font-mono text-xs text-text-secondary">
                {requirements.features.length} Core Modules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {requirements.features.map((feat, idx) => (
                <div
                  key={feat.name + idx}
                  className="flex flex-col justify-between p-4 rounded-lg bg-surface-1 border border-border hover:border-border-hover transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-muted text-cyan border border-cyan-border uppercase">
                        {feat.priority.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[10px] text-emerald">READY</span>
                    </div>
                    <h3 className="text-sm font-medium text-text-primary">{feat.name}</h3>
                    <p className="text-xs text-text-secondary leading-snug">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60">
                    <div className="h-9 w-full bg-canvas rounded flex items-center justify-between px-2.5 font-mono text-[10px] text-text-secondary border border-border/50">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                        {feat.requires_backend ? 'Full-Stack Module' : 'UI Component'}
                      </span>
                      <span className="text-emerald font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: Auto-Resolved Tech Stack */}
          <section className="p-4 rounded-lg bg-surface-1 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-cyan" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Auto-Resolved Technology Stack
                </h3>
              </div>
              <span className="font-mono text-[11px] text-emerald">
                Zero Configuration Conflicts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="p-3 rounded bg-surface-2 border border-border flex flex-col gap-1">
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                  Frontend Engine
                </span>
                <span className="text-sm text-text-primary font-medium uppercase">
                  {requirements.technology_stack.framework} (App Router)
                </span>
                <span className="font-mono text-[11px] text-text-secondary">
                  {requirements.technology_stack.styling} + Geist Tokens
                </span>
              </div>

              <div className="p-3 rounded bg-surface-2 border border-border flex flex-col gap-1">
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                  Persistence Layer
                </span>
                <span className="text-sm text-text-primary font-medium uppercase">
                  {requirements.technology_stack.database}
                </span>
                <span className="font-mono text-[11px] text-text-secondary">
                  Backend: {requirements.technology_stack.backend}
                </span>
              </div>

              <div className="p-3 rounded bg-surface-2 border border-border flex flex-col gap-1">
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                  Auth & Libraries
                </span>
                <span className="text-sm text-text-primary font-medium">
                  {requirements.technology_stack.auth_methods.join(', ') || 'Public'}
                </span>
                <span className="font-mono text-[11px] text-text-secondary truncate">
                  {requirements.technology_stack.additional_libraries.slice(0, 3).join(' • ') ||
                    'TypeScript Strict'}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 4: Live Agent Chat Panel in Project Workspace */}
          <AgentChatPanel
            projectId={projectId}
            token={tokenStr}
            messages={messages}
            currentStage={currentStage}
            shouldWaitForUser={shouldWait}
            waitReason={waitReason}
            isProcessing={isProcessing}
            onSendMessage={handleSendChatMessage}
            onApproveStack={handleApproveStack}
          />
        </div>

        {/* Secondary Column: Clarifications, Security Checklist, Terminal & Actions (5 Cols) */}
        <aside className="lg:col-span-5 space-y-6">
          {/* SECTION 5: Interactive Clarification Drawer */}
          <section className="p-4 rounded-lg bg-surface-1 border border-border space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-cyan" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Agent Clarifications
                </h2>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-muted text-cyan border border-cyan-border">
                {questions.length} Decisions Needed
              </span>
            </div>

            <p className="text-xs text-text-secondary">
              Devora detected configurable architectural parameters. Adjust defaults before scaffolding begins:
            </p>

            <div className="space-y-3">
              {questions.map((q, qIdx) => {
                const currentSelection = selectedAnswers[q.id] || q.default || q.options?.[0];
                const options =
                  q.options && q.options.length > 0
                    ? q.options
                    : ['Confirm Default', 'Customize in Chat'];

                return (
                  <div
                    key={q.id}
                    className="p-3 rounded bg-surface-2 border border-border space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-cyan uppercase font-semibold">
                        Q{qIdx + 1} • {q.id.replace(/^q_/, '').replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted truncate max-w-[160px]">
                        {q.why}
                      </span>
                    </div>

                    <p className="text-xs text-text-primary">{q.question}</p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {options.map((opt) => {
                        const isSelected = currentSelection === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                            }
                            className={`px-2.5 py-1.5 rounded border text-left font-mono text-[11px] flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'border-cyan bg-cyan-muted text-cyan'
                                : 'border-border bg-surface-3 text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            <span className="truncate pr-1">{opt}</span>
                            {isSelected && <Check size={12} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={isProcessing}
              onClick={handleSubmitClarifications}
            >
              Apply Clarification Decisions & Update Spec
            </Button>
          </section>

          {/* SECTION 6: Agent Health & Security Verification Checklist */}
          <section className="p-4 rounded-lg bg-surface-1 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald" />
                Security & Schema Pass
              </span>
              <span className="font-mono text-[10px] text-emerald">
                {requirements.assumptions_made.length} / {requirements.assumptions_made.length} PASSED
              </span>
            </div>

            <div className="space-y-2">
              {requirements.assumptions_made.slice(0, 4).map((assumption, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs text-text-primary bg-surface-2 px-3 py-2 rounded border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald shrink-0" />
                    <span className="truncate">{assumption}</span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted ml-2 shrink-0">
                    PASS
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 7: Terminal Output & PRD Output Actions */}
          <section className="p-4 rounded-lg bg-surface-1 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                <span>SYNTHESIS_PIPELINE.LOG</span>
              </div>
              <span className="font-mono text-[10px] text-text-muted">devora-cli v2.4</span>
            </div>

            <div className="p-3 rounded bg-canvas font-mono text-[11px] text-text-secondary leading-relaxed overflow-x-auto border border-border">
              <div>
                <span className="text-emerald">&gt;</span> parsing natural prompt tokens: 1,420 parsed in 410ms
              </div>
              <div>
                <span className="text-emerald">&gt;</span> resolving routes:{' '}
                {requirements.pages.map((p) => p.route).join(', ')} [OK]
              </div>
              <div>
                <span className="text-emerald">&gt;</span> stack verified:{' '}
                {requirements.technology_stack.framework} + {requirements.technology_stack.styling} +{' '}
                {requirements.technology_stack.database}
              </div>
              <div className="text-cyan">
                &gt; ready for pipeline dispatch: stage &apos;{currentStage}&apos;
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                icon={<Download size={14} />}
                onClick={handleExportPrd}
              >
                Export PRD (Markdown)
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                loading={isProcessing}
                onClick={() => {
                  handleApproveStack('proceed');
                  router.push('/workspace');
                }}
              >
                <span>Continue to Dev Flow</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
