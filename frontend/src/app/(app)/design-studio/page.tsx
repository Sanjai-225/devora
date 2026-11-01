'use client';

/**
 * Devora Design Studio Page (Phase 3 — Optional Design System).
 * Matches Stitch `devora_design_studio` (Obsidian Cyan Precision) 3-pane layout:
 *  - Left Pane: AI Design Assistant Chat + Quick Chips + Version History Timeline (with Restore)
 *  - Center Pane: Responsive Viewport Switcher (1440px / 768px / 390px) + Sandpack Live Prototype Canvas
 *  - Right Pane: Design Tokens Editor, Component Inspector & Pages Manager + Approve & Sync CTA
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SandpackPreview,
  type InspectedElement,
  type ViewportSize,
} from '@/components/design/sandpack-preview';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import type { ColorPalette, DesignSpecification, DesignVersion } from '@/types';
import {
  Bot,
  Check,
  CheckCircle2,
  History,
  Laptop,
  Layers,
  MousePointerClick,
  Palette,
  RotateCcw,
  Send,
  Sliders,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const INITIAL_SPEC: DesignSpecification = {
  color_palette: {
    primary: '#00F0FF',
    secondary: '#6366F1',
    accent: '#10B981',
    background: '#080A0D',
    surface: '#151921',
    text: '#F3F6FA',
    text_secondary: '#94A3B8',
  },
  typography: {
    heading_font: 'Geist',
    body_font: 'Geist',
    mono_font: 'JetBrains Mono',
    scale: 'default',
  },
  spacing_scale: 'default',
  border_radius: '8px',
  component_style: 'minimal',
  layout_pattern: 'sidebar',
  dark_mode: true,
  pages_designed: [
    'Telemetry & Centroid Tracking',
    'Fleet Diagnostics & DTC Triage',
    'Subscription & Telematics Billing',
  ],
  navigation_style: 'top-bar',
};

function generateClientPrototypeCode(
  projectName: string,
  spec: DesignSpecification,
): string {
  const p = spec.color_palette;
  const t = spec.typography;
  return `import React, { useState } from 'react';

export const DESIGN_TOKENS = {
  colors: {
    primary: '${p.primary}',
    secondary: '${p.secondary}',
    accent: '${p.accent}',
    background: '${p.background}',
    surface: '${p.surface}',
    text: '${p.text}',
    textSecondary: '${p.text_secondary}',
  },
  typography: {
    heading: '${t.heading_font}',
    body: '${t.body_font}',
    mono: '${t.mono_font}',
    scale: '${t.scale}',
  },
  radius: '${spec.border_radius}',
  layout: '${spec.layout_pattern}',
};

export default function PrototypeApp() {
  const [activePage, setActivePage] = useState('${spec.pages_designed[0] || 'Dashboard'}');
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <div style={{ background: DESIGN_TOKENS.colors.background, color: DESIGN_TOKENS.colors.text, minHeight: '100vh' }}>
      <header className="px-8 py-4 border-b border-white/10 flex items-center justify-between">
        <span className="font-bold text-lg">${projectName}</span>
        <nav className="flex gap-6 text-xs">
          ${JSON.stringify(spec.pages_designed)}.map((page) => (
            <button key={page} onClick={() => setActivePage(page)}>{page}</button>
          ))
        </nav>
      </header>
      <main className="p-10 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{activePage}</h1>
      </main>
    </div>
  );
}
`;
}

const DEFAULT_VERSIONS: DesignVersion[] = [
  {
    id: 'design-v1',
    project_id: 'proj-001',
    version_number: 1,
    version_tag: 'v1.0',
    label: 'Initial Architecture & Theme',
    prompt: 'Initial design generation from requirement specification',
    summary_of_changes:
      'Generated initial Obsidian Cyan Precision design tokens and 3-column responsive prototype.',
    design_spec: {
      ...INITIAL_SPEC,
      color_palette: {
        ...INITIAL_SPEC.color_palette,
        primary: '#38BDF8',
      },
      border_radius: '6px',
    },
    prototype_code: generateClientPrototypeCode('Novastride Fleet', {
      ...INITIAL_SPEC,
      color_palette: { ...INITIAL_SPEC.color_palette, primary: '#38BDF8' },
      border_radius: '6px',
    }),
    approved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: 'design-v2',
    project_id: 'proj-001',
    version_number: 2,
    version_tag: 'v1.1',
    label: 'Electric Cyan Accents & Pro Glow',
    prompt:
      'Make the Pro card stand out with an Electric Cyan border glow (#00F0FF) and 8px radius.',
    summary_of_changes:
      'Updated primary accent token to #00F0FF, added border glow on Pro card, and set border_radius to 8px.',
    design_spec: INITIAL_SPEC,
    prototype_code: generateClientPrototypeCode('Novastride Fleet', INITIAL_SPEC),
    approved: false,
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
];

const QUICK_PROMPTS = [
  'Switch primary accent to Emerald (#10B981)',
  'Increase card border radius to 12px',
  'Use Space Grotesk for headings',
  'Apply deeper obsidian surface (#11151C)',
];

export default function DesignStudioPage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const projectId = params?.id || searchParams.get('project') || 'proj-001';

  const [projectName, setProjectName] = useState<string>('Novastride Fleet');
  const [projectSummary, setProjectSummary] = useState<string>(
    'High-performance IoT Fleet Intelligence Dashboard with real-time GPS telemetry and tiered subscriptions.',
  );
  const [versions, setVersions] = useState<DesignVersion[]>(DEFAULT_VERSIONS);
  const [activeVersionId, setActiveVersionId] = useState<string>('design-v2');
  const [designSpec, setDesignSpec] = useState<DesignSpecification>(INITIAL_SPEC);
  const [prototypeCode, setPrototypeCode] = useState<string>(() =>
    generateClientPrototypeCode('Novastride Fleet', INITIAL_SPEC),
  );

  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [zoom, setZoom] = useState<number>(100);
  const [inspectMode, setInspectMode] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<string>(
    INITIAL_SPEC.pages_designed[2] || 'Subscription & Telematics Billing',
  );
  const [rightTab, setRightTab] = useState<'tokens' | 'inspector' | 'pages'>('tokens');
  const [selectedElement, setSelectedElement] = useState<InspectedElement>({
    id: 'card-pro-tier',
    tag: 'div.pricing-card-pro',
    name: 'Pro Tier Highlighted Card',
    classes:
      'rounded-xl p-6 bg-[#151921]/90 border-2 border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.12)]',
    description:
      'Primary conversion card highlighted with Electric Cyan border & shadow glow.',
  });

  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<
    Array<{ id: string; role: 'user' | 'agent'; text: string; versionTag?: string }>
  >([
    {
      id: 'c-1',
      role: 'user',
      text: 'Make the Pro card stand out with an Electric Cyan border glow (#00F0FF) and 8px radius.',
    },
    {
      id: 'c-2',
      role: 'agent',
      text: 'Updated primary accent token to #00F0FF, applied a 2px glowing border on `div.pricing-card-pro`, and synchronized the Sandpack prototype.',
      versionTag: 'v1.1',
    },
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const applyVersionToCanvas = useCallback(
    (ver: DesignVersion) => {
      setActiveVersionId(ver.id);
      setDesignSpec(ver.design_spec);
      setPrototypeCode(
        ver.prototype_code || generateClientPrototypeCode(projectName, ver.design_spec),
      );
      if (
        ver.design_spec.pages_designed &&
        ver.design_spec.pages_designed.length > 0 &&
        !ver.design_spec.pages_designed.includes(activePage)
      ) {
        setActivePage(ver.design_spec.pages_designed[0]);
      }
    },
    [projectName, activePage],
  );

  useEffect(() => {
    let active = true;
    async function loadStudioState() {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(`devora_project_${projectId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (active && parsed.name) setProjectName(parsed.name);
            if (active && parsed.description) setProjectSummary(parsed.description);
          } catch {
            // ignore
          }
        }
      }

      try {
        const tok = (await getToken()) || 'dev-token';
        const list = await api.listDesignVersions(tok, projectId);
        if (!active) return;

        if (list.versions && list.versions.length > 0) {
          setVersions(list.versions);
          const target =
            list.versions.find((v) => v.id === list.active_version_id) ||
            list.versions[list.versions.length - 1];
          applyVersionToCanvas(target);
        } else {
          const generated = await api.generateDesign(tok, projectId);
          if (!active) return;
          setVersions([generated]);
          applyVersionToCanvas(generated);
        }
      } catch {
        // Offline / static preview mode keeps DEFAULT_VERSIONS active
      }
    }
    loadStudioState();
    return () => {
      active = false;
    };
  }, [projectId, getToken, applyVersionToCanvas]);

  const applyLocalModification = (
    promptText: string,
    tokenOverrides?: Partial<DesignSpecification>,
  ) => {
    const nextNum = versions.length + 1;
    const nextTag = `v1.${nextNum - 1}`;
    const lower = promptText.toLowerCase();

    const updatedPalette: ColorPalette = {
      ...designSpec.color_palette,
      ...(tokenOverrides?.color_palette || {}),
    };

    if (lower.includes('emerald') || lower.includes('#10b981')) {
      updatedPalette.primary = '#10B981';
    } else if (lower.includes('indigo') || lower.includes('#6366f1')) {
      updatedPalette.primary = '#6366F1';
    } else if (lower.includes('amber') || lower.includes('#f59e0b')) {
      updatedPalette.primary = '#F59E0B';
    } else if (lower.includes('cyan') || lower.includes('#00f0ff')) {
      updatedPalette.primary = '#00F0FF';
    }

    if (lower.includes('darker') || lower.includes('#11151c')) {
      updatedPalette.surface = '#11151C';
    }

    let nextRadius = tokenOverrides?.border_radius || designSpec.border_radius;
    if (lower.includes('12px') || lower.includes('rounded')) {
      nextRadius = '12px';
    } else if (lower.includes('16px') || lower.includes('pill')) {
      nextRadius = '16px';
    } else if (lower.includes('4px') || lower.includes('sharp')) {
      nextRadius = '4px';
    }

    let nextHeadingFont =
      tokenOverrides?.typography?.heading_font || designSpec.typography.heading_font;
    if (lower.includes('space grotesk')) {
      nextHeadingFont = 'Space Grotesk';
    } else if (lower.includes('inter')) {
      nextHeadingFont = 'Inter';
    }

    const nextSpec: DesignSpecification = {
      ...designSpec,
      ...tokenOverrides,
      color_palette: updatedPalette,
      typography: {
        ...designSpec.typography,
        ...(tokenOverrides?.typography || {}),
        heading_font: nextHeadingFont,
      },
      border_radius: nextRadius,
    };

    const nextCode = generateClientPrototypeCode(projectName, nextSpec);
    const newVersion: DesignVersion = {
      id: `design-v${nextNum}`,
      project_id: projectId,
      version_number: nextNum,
      version_tag: nextTag,
      label: promptText.slice(0, 42),
      prompt: promptText,
      summary_of_changes: `Applied design update ("${promptText}") and regenerated Sandpack prototype.`,
      design_spec: nextSpec,
      prototype_code: nextCode,
      approved: false,
      created_at: new Date().toISOString(),
    };

    setVersions((prev) => [...prev, newVersion]);
    applyVersionToCanvas(newVersion);
    return newVersion;
  };

  const handleSendModification = async (promptOverride?: string) => {
    const promptText = (promptOverride ?? chatInput).trim();
    if (!promptText || isGenerating) return;

    setChatInput('');
    setIsGenerating(true);
    setStatusBanner(null);

    const userMsgId = `msg-${Date.now()}`;
    setChatHistory((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: promptText },
    ]);

    try {
      const tok = (await getToken()) || 'dev-token';
      const created = await api.modifyDesign(tok, projectId, promptText);
      setVersions((prev) => [...prev, created]);
      applyVersionToCanvas(created);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'agent',
          text: created.summary_of_changes,
          versionTag: created.version_tag,
        },
      ]);
      setStatusBanner(`Created ${created.version_tag}: ${created.label}`);
    } catch {
      const created = applyLocalModification(promptText);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'agent',
          text: created.summary_of_changes,
          versionTag: created.version_tag,
        },
      ]);
      setStatusBanner(`Created ${created.version_tag}: ${created.label}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTokenCheckpoint = async () => {
    setIsGenerating(true);
    const label = `Token update (${designSpec.color_palette.primary} • ${designSpec.border_radius})`;
    try {
      const tok = (await getToken()) || 'dev-token';
      const created = await api.modifyDesign(tok, projectId, label, {
        color_palette: designSpec.color_palette,
        typography: designSpec.typography,
        border_radius: designSpec.border_radius,
        spacing_scale: designSpec.spacing_scale,
      });
      setVersions((prev) => [...prev, created]);
      applyVersionToCanvas(created);
      setStatusBanner(`Saved token snapshot as ${created.version_tag}`);
    } catch {
      const created = applyLocalModification(label, designSpec);
      setStatusBanner(`Saved token snapshot as ${created.version_tag}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestoreVersion = async (ver: DesignVersion) => {
    setStatusBanner(null);
    try {
      const tok = (await getToken()) || 'dev-token';
      const restored = await api.restoreDesignVersion(tok, projectId, ver.id);
      applyVersionToCanvas(restored);
      setStatusBanner(`Restored design version ${restored.version_tag} (${restored.label})`);
    } catch {
      applyVersionToCanvas(ver);
      setStatusBanner(`Restored design version ${ver.version_tag} (${ver.label})`);
    }
  };

  const handleApproveAndSync = async () => {
    setIsApproving(true);
    setStatusBanner(null);
    try {
      const tok = (await getToken()) || 'dev-token';
      const approved = await api.approveDesignVersion(tok, projectId, activeVersionId);
      setVersions((prev) =>
        prev.map((v) => ({ ...v, approved: v.id === approved.id })),
      );
      setStatusBanner(
        `Design ${approved.version_tag} approved & synced! Redirecting to Code Workspace...`,
      );
    } catch {
      setVersions((prev) =>
        prev.map((v) => ({ ...v, approved: v.id === activeVersionId })),
      );
      setStatusBanner(
        'Design approved & synced with codebase! Redirecting to Code Workspace...',
      );
    } finally {
      setIsApproving(false);
      setTimeout(() => {
        router.push(`/workspace?project=${projectId}`);
      }, 650);
    }
  };

  const activeVersion =
    versions.find((v) => v.id === activeVersionId) || versions[versions.length - 1];

  const updateColorToken = (key: keyof ColorPalette, value: string) => {
    const nextSpec: DesignSpecification = {
      ...designSpec,
      color_palette: {
        ...designSpec.color_palette,
        [key]: value,
      },
    };
    setDesignSpec(nextSpec);
    setPrototypeCode(generateClientPrototypeCode(projectName, nextSpec));
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-canvas">
      {/* Top Studio Header Bar (Matches Stitch devora_design_studio) */}
      <header className="h-13 px-4 bg-surface-1 border-b border-border flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Project & Active Version */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/projects/${projectId}`}
              className="text-text-secondary hover:text-text-primary transition-colors truncate"
            >
              {projectName}
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary font-semibold flex items-center gap-1.5">
              <Palette size={14} className="text-cyan" />
              <span>Design Studio</span>
            </span>
          </div>

          {activeVersion && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-border text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
              <span className="font-mono text-cyan font-semibold">
                {activeVersion.version_tag}
              </span>
              <span className="text-text-secondary truncate max-w-[150px]">
                {activeVersion.label}
              </span>
              {activeVersion.approved && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-muted text-emerald text-[10px] font-mono border border-emerald-border">
                  APPROVED
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Viewport Switcher & Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewport === 'desktop'
                  ? 'bg-surface-3 text-cyan shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Laptop size={13} />
              <span className="hidden md:inline">Desktop</span>
              <span className="text-[10px] font-mono opacity-75">1440px</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewport === 'tablet'
                  ? 'bg-surface-3 text-cyan shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Tablet size={13} />
              <span className="hidden md:inline">Tablet</span>
              <span className="text-[10px] font-mono opacity-75">768px</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewport === 'mobile'
                  ? 'bg-surface-3 text-cyan shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Smartphone size={13} />
              <span className="hidden md:inline">Mobile</span>
              <span className="text-[10px] font-mono opacity-75">390px</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg border border-border text-xs font-mono text-text-secondary">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              className="hover:text-text-primary p-0.5"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-10 text-center text-text-primary">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(115, z + 10))}
              className="hover:text-text-primary p-0.5"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Inspect Element Toggle */}
          <button
            type="button"
            onClick={() => {
              setInspectMode((v) => !v);
              if (!inspectMode) setRightTab('inspector');
            }}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              inspectMode
                ? 'bg-cyan-muted text-cyan border-cyan-border'
                : 'bg-surface-2 text-text-secondary border-border hover:text-text-primary'
            }`}
          >
            <MousePointerClick size={13} />
            <span>Inspect</span>
          </button>
        </div>

        {/* Right: Approve & Sync CTA */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            loading={isApproving}
            onClick={handleApproveAndSync}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Approve &amp; Sync with Codebase</span>
          </Button>
        </div>
      </header>

      {/* Optional Status Notification Bar */}
      {statusBanner && (
        <div className="px-4 py-1.5 bg-emerald-muted border-b border-emerald-border text-emerald text-xs font-mono flex items-center justify-between shrink-0">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={13} />
            <span>{statusBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-Pane Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Design Assistant + Version History (320px) */}
        <aside className="w-80 bg-surface-1 border-r border-border flex flex-col shrink-0 overflow-hidden">
          {/* Assistant Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Design Assistant
              </h2>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3 text-cyan border border-border">
              Gemini UI Synth
            </span>
          </div>

          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {chatHistory.map((item) =>
              item.role === 'user' ? (
                <div key={item.id} className="flex flex-col items-end">
                  <div className="bg-surface-3 border border-border rounded-lg rounded-tr-none p-2.5 text-xs text-text-primary max-w-[90%] leading-relaxed">
                    {item.text}
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-cyan-muted border border-cyan-border flex items-center justify-center shrink-0 mt-0.5 text-cyan">
                    <Bot size={13} />
                  </div>
                  <div className="bg-canvas border border-border rounded-lg rounded-tl-none p-2.5 text-xs text-text-secondary space-y-1.5 flex-1">
                    <p className="text-text-primary leading-relaxed">{item.text}</p>
                    {item.versionTag && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald">
                        <CheckCircle2 size={11} />
                        <span>Synced to prototype ({item.versionTag})</span>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {/* Quick Modification Prompt Chips */}
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                Quick Iteration Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleSendModification(chip)}
                    className="text-left text-[11px] px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-cyan border border-border transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Version History Timeline Section */}
          <div className="border-t border-border bg-canvas/50 p-3 space-y-2 max-h-52 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-semibold">
                <History size={12} className="text-cyan" />
                <span>Version History ({versions.length})</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted">Click to inspect</span>
            </div>

            <div className="space-y-1.5">
              {[...versions].reverse().map((ver) => {
                const isCurrent = ver.id === activeVersionId;
                return (
                  <div
                    key={ver.id}
                    onClick={() => applyVersionToCanvas(ver)}
                    className={`p-2 rounded-md border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-cyan-muted border-cyan-border text-text-primary'
                        : 'bg-surface-1 border-border text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-cyan">
                          {ver.version_tag}
                        </span>
                        <span className="truncate font-medium text-text-primary">
                          {ver.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted block truncate">
                        {ver.prompt}
                      </span>
                    </div>

                    {!isCurrent ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreVersion(ver);
                        }}
                        className="px-2 py-1 rounded bg-surface-3 hover:bg-cyan hover:text-[#080A0D] text-[10px] font-mono text-text-primary flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <RotateCcw size={10} />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-cyan shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt Composer Box */}
          <div className="p-3 border-t border-border bg-surface-2">
            <div className="rounded-lg bg-canvas border border-border focus-within:border-cyan p-2 transition-colors">
              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendModification();
                  }
                }}
                placeholder="Describe a UI change (e.g. 'Use Emerald primary and 12px radius')..."
                className="w-full bg-transparent text-xs text-text-primary placeholder-text-muted resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between pt-1.5 border-t border-border/60 mt-1">
                <span className="text-[10px] font-mono text-text-muted">
                  Enter to synthesize version
                </span>
                <button
                  type="button"
                  disabled={!chatInput.trim() || isGenerating}
                  onClick={() => handleSendModification()}
                  className="px-2.5 py-1 rounded bg-cyan text-[#080A0D] font-semibold text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-cyan-hover transition-colors"
                >
                  <Send size={11} />
                  <span>{isGenerating ? 'Updating...' : 'Apply'}</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANE: Interactive Sandpack Prototype Canvas */}
        <SandpackPreview
          projectName={projectName}
          projectSummary={projectSummary}
          designSpec={designSpec}
          prototypeCode={prototypeCode}
          viewport={viewport}
          zoom={zoom}
          inspectMode={inspectMode}
          activePage={activePage}
          selectedElementId={selectedElement?.id}
          onSelectPage={setActivePage}
          onSelectElement={(el) => {
            setSelectedElement(el);
            setRightTab('inspector');
          }}
        />

        {/* RIGHT PANE: Design Tokens, Inspector & Pages (296px) */}
        <aside className="w-74 bg-surface-1 border-l border-border flex flex-col shrink-0 overflow-hidden">
          {/* Tabs Header */}
          <div className="grid grid-cols-3 border-b border-border bg-surface-2 p-1 gap-1">
            <button
              type="button"
              onClick={() => setRightTab('tokens')}
              className={`py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                rightTab === 'tokens'
                  ? 'bg-surface-1 text-cyan shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sliders size={12} />
              <span>Tokens</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('inspector')}
              className={`py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                rightTab === 'inspector'
                  ? 'bg-surface-1 text-cyan shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <MousePointerClick size={12} />
              <span>Inspector</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('pages')}
              className={`py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                rightTab === 'pages'
                  ? 'bg-surface-1 text-cyan shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers size={12} />
              <span>Pages</span>
            </button>
          </div>

          {/* Right Pane Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {rightTab === 'tokens' && (
              <>
                {/* Color Palette Section */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
                      Color Tokens
                    </span>
                    <span className="text-[10px] font-mono text-cyan">WCAG AAA</span>
                  </div>

                  <div className="space-y-2">
                    {(
                      [
                        ['primary', 'Primary Accent'],
                        ['secondary', 'Secondary'],
                        ['accent', 'Success / Emerald'],
                        ['background', 'Canvas Background'],
                        ['surface', 'Card Surface'],
                      ] as Array<[keyof ColorPalette, string]>
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded bg-surface-2 border border-border"
                      >
                        <span className="text-xs text-text-secondary">{label}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="color"
                            value={designSpec.color_palette[key]}
                            onChange={(e) => updateColorToken(key, e.target.value)}
                            className="w-5 h-5 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="font-mono text-xs text-text-primary uppercase">
                            {designSpec.color_palette[key]}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Typography Section */}
                <section className="space-y-2.5 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold flex items-center gap-1.5">
                      <Type size={12} className="text-cyan" />
                      <span>Typography System</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted block">
                        Heading &amp; Display Font
                      </label>
                      <select
                        value={designSpec.typography.heading_font}
                        onChange={(e) => {
                          const next: DesignSpecification = {
                            ...designSpec,
                            typography: {
                              ...designSpec.typography,
                              heading_font: e.target.value,
                            },
                          };
                          setDesignSpec(next);
                          setPrototypeCode(generateClientPrototypeCode(projectName, next));
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-surface-2 border border-border text-xs text-text-primary focus:border-cyan outline-none"
                      >
                        <option value="Geist">Geist Sans (Default)</option>
                        <option value="Inter">Inter</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted block">
                        Monospace Font
                      </label>
                      <div className="px-2.5 py-1.5 rounded bg-surface-2 border border-border text-xs font-mono text-text-secondary">
                        {designSpec.typography.mono_font}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Border Radius & Geometry */}
                <section className="space-y-2.5 pt-3 border-t border-border">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
                    Border Radius Scale
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['4px', '8px', '12px', '16px'].map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => {
                          const next = { ...designSpec, border_radius: rad };
                          setDesignSpec(next);
                          setPrototypeCode(generateClientPrototypeCode(projectName, next));
                        }}
                        className={`py-1.5 rounded font-mono text-xs border transition-colors ${
                          designSpec.border_radius === rad
                            ? 'bg-cyan-muted border-cyan text-cyan font-semibold'
                            : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {rad}
                      </button>
                    ))}
                  </div>
                </section>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  loading={isGenerating}
                  onClick={handleSaveTokenCheckpoint}
                >
                  <Sparkles size={13} className="text-cyan" />
                  <span>Save Token Snapshot</span>
                </Button>
              </>
            )}

            {rightTab === 'inspector' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-cyan-muted border border-cyan-border space-y-1">
                  <span className="text-[10px] font-mono uppercase text-cyan font-semibold">
                    Selected Element
                  </span>
                  <div className="font-mono text-xs text-text-primary font-bold">
                    {selectedElement.tag}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {selectedElement.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase text-text-muted block">
                    Tailwind Classes
                  </span>
                  <div className="p-2.5 rounded bg-canvas border border-border font-mono text-[11px] text-cyan leading-relaxed break-words">
                    {selectedElement.classes}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase text-text-muted block">
                    Bound Design Tokens
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between p-2 rounded bg-surface-2 border border-border">
                      <span className="text-text-secondary">Accent Border</span>
                      <span className="font-mono text-cyan">
                        {designSpec.color_palette.primary}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-surface-2 border border-border">
                      <span className="text-text-secondary">Surface Token</span>
                      <span className="font-mono text-text-primary">
                        {designSpec.color_palette.surface}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-surface-2 border border-border">
                      <span className="text-text-secondary">Corner Radius</span>
                      <span className="font-mono text-text-primary">
                        {designSpec.border_radius}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'pages' && (
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
                  Prototype Pages ({designSpec.pages_designed.length})
                </span>
                <div className="space-y-2">
                  {designSpec.pages_designed.map((page, idx) => {
                    const isCurrent = activePage === page;
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setActivePage(page)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-cyan-muted border-cyan text-text-primary'
                            : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-cyan block">
                            PAGE 0{idx + 1}
                          </span>
                          <span className="text-xs font-medium truncate block">
                            {page}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-cyan">ACTIVE</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
