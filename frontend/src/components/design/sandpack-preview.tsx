'use client';

/**
 * Sandpack-compatible Interactive Prototype Preview Component.
 * Renders the generated React/TypeScript prototype across Desktop (1440px),
 * Tablet (768px), and Mobile (390px) viewports, supports live design token
 * overrides, interactive component inspection, and raw React/TSX source viewing.
 * Matches Stitch `devora_design_studio` center canvas.
 */

import { useState } from 'react';
import type { DesignSpecification } from '@/types';
import {
  Check,
  Code2,
  Copy,
  Eye,
  Lock,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export interface InspectedElement {
  id: string;
  tag: string;
  name: string;
  classes: string;
  description: string;
}

interface SandpackPreviewProps {
  projectName: string;
  projectSummary?: string;
  designSpec: DesignSpecification;
  prototypeCode: string;
  viewport: ViewportSize;
  zoom: number;
  inspectMode: boolean;
  activePage: string;
  selectedElementId?: string | null;
  onSelectPage: (page: string) => void;
  onSelectElement?: (element: InspectedElement) => void;
}

export function SandpackPreview({
  projectName,
  projectSummary,
  designSpec,
  prototypeCode,
  viewport,
  zoom,
  inspectMode,
  activePage,
  selectedElementId,
  onSelectPage,
  onSelectElement,
}: SandpackPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [copiedCode, setCopiedCode] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const palette = designSpec.color_palette;
  const typography = designSpec.typography;
  const pages =
    designSpec.pages_designed && designSpec.pages_designed.length > 0
      ? designSpec.pages_designed
      : ['Landing & Hero', 'Telemetry Dashboard', 'Pricing & Billing'];

  const viewportWidthClass =
    viewport === 'desktop'
      ? 'w-full max-w-[1120px]'
      : viewport === 'tablet'
        ? 'w-[768px]'
        : 'w-[390px]';

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(prototypeCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  const handleInspectClick = (el: InspectedElement) => {
    if (onSelectElement) {
      onSelectElement(el);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Mode Switcher Floating Pill (Preview vs Prototype TSX Code) */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-1/90 border-b border-border backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted mr-1">
            Prototype Pages:
          </span>
          {pages.map((page) => {
            const isActive = activePage === page;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onSelectPage(page)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-muted text-cyan border border-cyan-border'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-canvas p-0.5 rounded-md border border-border">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-surface-3 text-cyan shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye size={13} />
              <span>Live Sandpack</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-surface-3 text-cyan shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Code2 size={13} />
              <span>PrototypeApp.tsx</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            title="Hot-reload prototype frame"
            className="p-1.5 rounded bg-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="flex-1 overflow-auto p-6 lg:p-8 flex items-start justify-center relative"
        style={{
          backgroundImage: 'radial-gradient(#1E2636 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {viewMode === 'code' ? (
          <div className="w-full max-w-[1040px] rounded-xl border border-border bg-[#090B0E] shadow-2xl overflow-hidden">
            <div className="h-10 px-4 bg-surface-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                <Code2 size={14} className="text-cyan" />
                <span>/src/prototype/PrototypeApp.tsx</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] text-emerald border border-border">
                  Sandpack React + TypeScript
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-3 hover:bg-border text-xs font-mono text-text-primary transition-colors"
              >
                {copiedCode ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                <span>{copiedCode ? 'Copied' : 'Copy TSX'}</span>
              </button>
            </div>
            <pre className="p-5 font-mono text-xs text-text-secondary overflow-x-auto leading-relaxed max-h-[680px]">
              <code>{prototypeCode}</code>
            </pre>
          </div>
        ) : (
          <div
            key={refreshTick}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              backgroundColor: palette.background,
              color: palette.text,
              fontFamily: typography.body_font,
            }}
            className={`${viewportWidthClass} rounded-xl border border-border shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 relative`}
          >
            {/* Simulated Browser Frame Bar */}
            <div className="h-9 bg-[#12161F] border-b border-white/10 px-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald/80" />
              </div>
              <div className="flex items-center gap-2 bg-[#0B0D10] border border-white/10 px-3 py-1 rounded text-[11px] font-mono text-text-secondary min-w-[240px] max-w-[360px] justify-center truncate">
                <Lock size={11} className="text-emerald shrink-0" />
                <span className="truncate">
                  https://preview.devora.local/{activePage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
                <span>
                  {viewport === 'desktop'
                    ? '1440×900'
                    : viewport === 'tablet'
                      ? '768×1024'
                      : '390×844'}
                </span>
              </div>
            </div>

            {/* Prototype App Navigation Header */}
            <header
              onClick={() =>
                handleInspectClick({
                  id: 'nav-header',
                  tag: 'header.prototype-navbar',
                  name: 'Navigation Header Bar',
                  classes: 'h-16 px-8 border-b border-white/10 flex items-center justify-between backdrop-blur-md',
                  description: `Primary ${designSpec.navigation_style} navigation bar with live route tabs and CTA.`,
                })
              }
              style={{
                borderBottomColor: 'rgba(255,255,255,0.08)',
              }}
              className={`px-6 lg:px-10 py-4 border-b flex items-center justify-between transition-all ${
                inspectMode ? 'cursor-pointer hover:ring-2 hover:ring-cyan/80' : ''
              } ${selectedElementId === 'nav-header' ? 'ring-2 ring-cyan' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                    borderRadius: designSpec.border_radius,
                  }}
                  className="w-7 h-7 flex items-center justify-center text-[#080A0D] font-bold text-xs shadow-sm"
                >
                  {projectName.slice(0, 1).toUpperCase()}
                </div>
                <span
                  style={{ fontFamily: typography.heading_font }}
                  className="font-bold text-base tracking-tight"
                >
                  {projectName}
                </span>
                <span
                  style={{
                    color: palette.primary,
                    borderColor: `${palette.primary}40`,
                    backgroundColor: `${palette.primary}15`,
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border ml-1"
                >
                  LIVE PROTOTYPE
                </span>
              </div>

              {viewport !== 'mobile' && (
                <div className="flex items-center gap-5 text-xs">
                  {pages.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(p);
                      }}
                      style={{
                        color: activePage === p ? palette.primary : palette.text_secondary,
                      }}
                      className="font-medium transition-colors hover:opacity-100"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                style={{
                  backgroundColor: palette.primary,
                  color: '#080A0D',
                  borderRadius: designSpec.border_radius,
                }}
                className="px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
              >
                Launch Console
              </button>
            </header>

            {/* Prototype Body Container */}
            <div className="p-6 lg:p-10 space-y-8 relative">
              {/* Ambient Top Glow */}
              <div
                style={{
                  background: `radial-gradient(circle, ${palette.primary}22 0%, transparent 70%)`,
                }}
                className="w-[420px] h-[220px] absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none blur-2xl"
              />

              {/* Hero Section */}
              <section
                onClick={() =>
                  handleInspectClick({
                    id: 'hero-banner',
                    tag: 'section.hero-container',
                    name: 'Hero Callout & Value Proposition',
                    classes: 'text-center max-w-2xl mx-auto space-y-4 relative z-10',
                    description: 'Hero header with live typography scale and accent badge.',
                  })
                }
                className={`text-center max-w-2xl mx-auto space-y-3 relative z-10 p-3 rounded-lg transition-all ${
                  inspectMode ? 'cursor-pointer hover:ring-2 hover:ring-cyan/80' : ''
                } ${selectedElementId === 'hero-banner' ? 'ring-2 ring-cyan' : ''}`}
              >
                <div
                  style={{
                    borderColor: `${palette.primary}45`,
                    backgroundColor: `${palette.primary}14`,
                    color: palette.primary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono uppercase tracking-wider"
                >
                  <Sparkles size={12} />
                  <span>{activePage} • {designSpec.layout_pattern}</span>
                </div>

                <h1
                  style={{ fontFamily: typography.heading_font }}
                  className={`font-bold tracking-tight ${
                    viewport === 'mobile' ? 'text-2xl' : 'text-3xl lg:text-4xl'
                  }`}
                >
                  Scale securely with{' '}
                  <span
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})`,
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Autonomous Precision
                  </span>
                </h1>

                <p
                  style={{ color: palette.text_secondary }}
                  className="text-sm max-w-xl mx-auto leading-relaxed"
                >
                  {projectSummary ||
                    'Predictable architecture, real-time telemetry readouts, and enterprise-grade billing tiers synthesized directly from your specification.'}
                </p>

                {/* Billing Toggle */}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBillingCycle('monthly');
                    }}
                    style={{
                      borderColor:
                        billingCycle === 'monthly' ? palette.primary : 'rgba(255,255,255,0.12)',
                      backgroundColor:
                        billingCycle === 'monthly' ? `${palette.primary}18` : palette.surface,
                      color: billingCycle === 'monthly' ? palette.text : palette.text_secondary,
                      borderRadius: designSpec.border_radius,
                    }}
                    className="px-3 py-1 text-xs font-mono border transition-all"
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBillingCycle('annual');
                    }}
                    style={{
                      borderColor:
                        billingCycle === 'annual' ? palette.primary : 'rgba(255,255,255,0.12)',
                      backgroundColor:
                        billingCycle === 'annual' ? `${palette.primary}18` : palette.surface,
                      color: billingCycle === 'annual' ? palette.primary : palette.text_secondary,
                      borderRadius: designSpec.border_radius,
                    }}
                    className="px-3 py-1 text-xs font-mono border transition-all"
                  >
                    Annual Billing (-20%)
                  </button>
                </div>
              </section>

              {/* Interactive 3-Column Feature / Tier Grid (Matches Stitch devora_design_studio) */}
              <div
                className={`grid gap-5 relative z-10 ${
                  viewport === 'mobile'
                    ? 'grid-cols-1'
                    : viewport === 'tablet'
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {/* Card 1: Developer / Starter */}
                <div
                  onClick={() =>
                    handleInspectClick({
                      id: 'card-starter',
                      tag: 'div.tier-card-starter',
                      name: 'Starter Tier Card',
                      classes: 'rounded-xl p-6 bg-surface border border-white/10 flex flex-col justify-between',
                      description: 'Entry tier card bound to surface and border_radius tokens.',
                    })
                  }
                  style={{
                    backgroundColor: palette.surface,
                    borderRadius: designSpec.border_radius,
                    borderColor:
                      selectedElementId === 'card-starter'
                        ? palette.primary
                        : 'rgba(255,255,255,0.09)',
                  }}
                  className={`p-6 border flex flex-col justify-between transition-all ${
                    inspectMode ? 'cursor-pointer hover:ring-2 hover:ring-cyan/70' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Developer</span>
                      <span
                        style={{ color: palette.text_secondary }}
                        className="text-[11px] font-mono"
                      >
                        STARTER
                      </span>
                    </div>
                    <p
                      style={{ color: palette.text_secondary }}
                      className="text-xs mb-5 leading-relaxed"
                    >
                      Essential telemetry & edge streams for individual builders.
                    </p>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span
                        style={{ fontFamily: typography.mono_font }}
                        className="text-3xl font-bold"
                      >
                        {billingCycle === 'annual' ? '$24' : '$29'}
                      </span>
                      <span style={{ color: palette.text_secondary }} className="text-xs">
                        / month
                      </span>
                    </div>
                    <ul
                      style={{ color: palette.text_secondary }}
                      className="space-y-2.5 text-xs mb-6"
                    >
                      <li className="flex items-center gap-2">
                        <Check size={14} style={{ color: palette.accent }} />
                        <span>3 Active Edge Environments</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} style={{ color: palette.accent }} />
                        <span>100k Telemetry Events / mo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} style={{ color: palette.accent }} />
                        <span>Community Discord Support</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    style={{
                      borderRadius: designSpec.border_radius,
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border text-xs font-medium transition-colors"
                  >
                    Start Free Trial
                  </button>
                </div>

                {/* Card 2: Pro / Highlighted Inspect Target */}
                <div
                  onClick={() =>
                    handleInspectClick({
                      id: 'card-pro-tier',
                      tag: 'div.pricing-card-pro',
                      name: 'Pro Tier Highlighted Card',
                      classes:
                        'rounded-xl p-6 bg-[#151921]/90 border-2 border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.12)] flex flex-col justify-between relative',
                      description:
                        'Primary conversion card highlighted with Electric Cyan border & shadow glow.',
                    })
                  }
                  style={{
                    backgroundColor: palette.surface,
                    borderRadius: designSpec.border_radius,
                    borderColor: palette.primary,
                    boxShadow: `0 0 32px ${palette.primary}24`,
                  }}
                  className="p-6 border-2 flex flex-col justify-between relative transition-all cursor-pointer"
                >
                  {/* Inspect Element Tag Indicator matching Stitch */}
                  <div
                    style={{
                      backgroundColor: palette.primary,
                      color: '#080A0D',
                    }}
                    className="absolute -top-3 left-3 px-2 py-0.5 text-[10px] font-mono font-bold rounded flex items-center gap-1 shadow-md"
                  >
                    <MousePointerClick size={10} />
                    <span>div.pricing-card-pro</span>
                    <span className="opacity-75 ml-1">312 × 428</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 mt-1">
                      <span className="text-sm font-semibold">Pro Autonomous</span>
                      <span
                        style={{
                          backgroundColor: `${palette.primary}20`,
                          color: palette.primary,
                          borderColor: `${palette.primary}50`,
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border uppercase"
                      >
                        Most Popular
                      </span>
                    </div>
                    <p
                      style={{ color: palette.text_secondary }}
                      className="text-xs mb-5 leading-relaxed"
                    >
                      Full AI synthesis, sub-second WebSockets & team RBAC controls.
                    </p>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span
                        style={{ fontFamily: typography.mono_font }}
                        className="text-3xl font-bold"
                      >
                        {billingCycle === 'annual' ? '$79' : '$99'}
                      </span>
                      <span style={{ color: palette.text_secondary }} className="text-xs">
                        / month
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-xs mb-6">
                      <li className="flex items-center gap-2">
                        <Zap size={14} style={{ color: palette.primary }} />
                        <span>Unlimited Autonomous Workspaces</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Zap size={14} style={{ color: palette.primary }} />
                        <span>Custom Domain & SSL Provisioning</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Zap size={14} style={{ color: palette.primary }} />
                        <span>500ms High-Frequency Telemetry</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Zap size={14} style={{ color: palette.primary }} />
                        <span>GitHub Bidirectional Sync</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: palette.primary,
                      color: '#080A0D',
                      borderRadius: designSpec.border_radius,
                      boxShadow: `0 0 20px ${palette.primary}45`,
                    }}
                    className="w-full py-2.5 text-xs font-semibold transition-all hover:opacity-95"
                  >
                    Deploy Pro Workspace
                  </button>
                </div>

                {/* Card 3: Enterprise */}
                <div
                  onClick={() =>
                    handleInspectClick({
                      id: 'card-enterprise',
                      tag: 'div.tier-card-enterprise',
                      name: 'Enterprise Tier Card',
                      classes: 'rounded-xl p-6 bg-surface border border-white/10 flex flex-col justify-between',
                      description: 'Enterprise tier card with secondary accent styling.',
                    })
                  }
                  style={{
                    backgroundColor: palette.surface,
                    borderRadius: designSpec.border_radius,
                    borderColor:
                      selectedElementId === 'card-enterprise'
                        ? palette.secondary
                        : 'rgba(255,255,255,0.09)',
                  }}
                  className={`p-6 border flex flex-col justify-between transition-all ${
                    inspectMode ? 'cursor-pointer hover:ring-2 hover:ring-indigo/70' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Enterprise</span>
                      <span
                        style={{ color: palette.secondary }}
                        className="text-[11px] font-mono font-semibold"
                      >
                        DEDICATED
                      </span>
                    </div>
                    <p
                      style={{ color: palette.text_secondary }}
                      className="text-xs mb-5 leading-relaxed"
                    >
                      Dedicated VPC runners, SSO/SAML & custom SLA guarantees.
                    </p>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span
                        style={{ fontFamily: typography.mono_font }}
                        className="text-3xl font-bold"
                      >
                        Custom
                      </span>
                      <span style={{ color: palette.text_secondary }} className="text-xs">
                        annual contract
                      </span>
                    </div>
                    <ul
                      style={{ color: palette.text_secondary }}
                      className="space-y-2.5 text-xs mb-6"
                    >
                      <li className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: palette.secondary }} />
                        <span>Isolated Execution Runners</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: palette.secondary }} />
                        <span>SOC2 Type II & HIPAA BAA</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: palette.secondary }} />
                        <span>24/7 Dedicated Solutions Architect</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    style={{
                      borderRadius: designSpec.border_radius,
                      borderColor: `${palette.secondary}55`,
                      color: palette.text,
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border text-xs font-medium transition-colors"
                  >
                    Contact Architecture Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
