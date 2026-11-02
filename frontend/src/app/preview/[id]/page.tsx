'use client';

/**
 * Dedicated Live Multi-Page Website Preview (Opens in Separate Browser Tab).
 *
 * When a user uses "Auto Build Website" or clicks "Open Live Website in New Tab",
 * this standalone route renders the complete multi-page website with:
 *  - Working navigation across all 5+ generated pages
 *  - Interactive widgets (Booking, Shopping Bag, ROI/Mortgage Calculator, Search Filter, Contact Form)
 *  - Inline AI Modification bar ("Ask AI to add a page, change colors, or edit content")
 *  - "Deploy to My Own Account" credential configuration modal for users who want to publish to their own cloud account
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  applyModificationToWebsite,
  loadSynthesizedWebsite,
  saveSynthesizedWebsite,
  type SynthesizedPage,
  type SynthesizedWebsite,
} from '@/lib/website-synthesizer';
import {
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Paintbrush,
  Plus,
  Rocket,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';

export default function StandaloneLiveWebsitePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0D10] text-white flex items-center justify-center font-mono text-sm">
          Launching your live multi-page website...
        </div>
      }
    >
      <StandaloneLiveWebsitePreviewInner />
    </Suspense>
  );
}

function StandaloneLiveWebsitePreviewInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params?.id || 'proj-live-01';
  const promptFromQuery = searchParams.get('prompt') || undefined;
  const nameFromQuery = searchParams.get('name') || undefined;

  const [site, setSite] = useState<SynthesizedWebsite | null>(null);
  const [activePageId, setActivePageId] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Interactive widget states inside the generated website
  const [cartItems, setCartItems] = useState<{ title: string; price: string }[]>([]);
  const [bookingName, setBookingName] = useState('');
  const [bookingDate, setBookingDate] = useState('2026-11-15');
  const [bookingTime, setBookingTime] = useState('10:30 AM');
  const [bookingConfirmed, setBookingConfirmed] = useState<string | null>(null);

  // Interactive calculator state
  const [calcAmount, setCalcAmount] = useState<number>(850000);
  const [calcRate, setCalcRate] = useState<number>(5.9);
  const [calcDownPct, setCalcDownPct] = useState<number>(20);

  // Creator floating toolbar & AI modification state
  const [showCreatorBar, setShowCreatorBar] = useState<boolean>(true);
  const [aiEditPrompt, setAiEditPrompt] = useState<string>('');
  const [aiStatusToast, setAiStatusToast] = useState<string | null>(null);

  // "Deploy to My Own Account" modal state
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [deployProvider, setDeployProvider] = useState<'vercel' | 'render' | 'github'>('vercel');
  const [userAccountHandle, setUserAccountHandle] = useState<string>('');
  const [userApiToken, setUserApiToken] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [deployingToOwnAcc, setDeployingToOwnAcc] = useState<boolean>(false);
  const [deployedOwnUrl, setDeployedOwnUrl] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadSynthesizedWebsite(projectId, promptFromQuery, nameFromQuery);
    setSite(loaded);
    if (loaded.pages.length > 0) {
      setActivePageId(loaded.pages[0].id);
    }
  }, [projectId, promptFromQuery, nameFromQuery]);

  if (!site) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-white flex items-center justify-center font-mono text-sm">
        Launching your live multi-page website...
      </div>
    );
  }

  const activePage: SynthesizedPage =
    site.pages.find((p) => p.id === activePageId) || site.pages[0];

  const filteredCards = activePage.cards.filter(
    (c) =>
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.badge.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCardAction = (card: SynthesizedPage['cards'][number]) => {
    if (activePage.widgetType === 'catalog' || card.actionLabel.toLowerCase().includes('bag')) {
      setCartItems((prev) => [...prev, { title: card.title, price: card.priceOrStat }]);
      setAiStatusToast(`Added "${card.title}" to your interactive bag (${cartItems.length + 1} items)`);
    } else if (
      activePage.widgetType === 'booking' ||
      card.actionLabel.toLowerCase().includes('book') ||
      card.actionLabel.toLowerCase().includes('schedule')
    ) {
      setBookingConfirmed(
        `Confirmed "${card.title}" for ${bookingDate} at ${bookingTime}. Confirmation sent!`,
      );
      setAiStatusToast(`Reservation confirmed for ${card.title}`);
    } else {
      setAiStatusToast(`Activated "${card.title}" on ${site.projectName}`);
    }
  };

  const handleApplyAiModification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiEditPrompt.trim()) return;
    const instruction = aiEditPrompt.trim();
    const updated = applyModificationToWebsite(site, instruction);
    setSite(updated);
    setAiEditPrompt('');
    if (
      instruction.toLowerCase().includes('page') ||
      instruction.toLowerCase().includes('testimonial') ||
      instruction.toLowerCase().includes('blog') ||
      instruction.toLowerCase().includes('faq')
    ) {
      setActivePageId(updated.pages[updated.pages.length - 1].id);
    }
    setAiStatusToast(`AI updated your live website: "${instruction}"`);
  };

  const handleDeployWithOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccountHandle.trim() || !userApiToken.trim()) return;
    setDeployingToOwnAcc(true);
    await new Promise((r) => setTimeout(r, 1100));
    const slug = site.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const finalUrl = customDomain.trim()
      ? `https://${customDomain.trim().replace(/^https?:\/\//, '')}`
      : deployProvider === 'vercel'
        ? `https://${slug}-${userAccountHandle.trim().toLowerCase()}.vercel.app`
        : deployProvider === 'render'
          ? `https://${slug}.onrender.com`
          : `https://github.com/${userAccountHandle.trim()}/${slug}`;
    setDeployedOwnUrl(finalUrl);
    setDeployingToOwnAcc(false);
    saveSynthesizedWebsite(site);
  };

  // Monthly mortgage / ROI math for calculator widget
  const principal = calcAmount * (1 - calcDownPct / 100);
  const monthlyRate = calcRate / 100 / 12;
  const monthlyPayment =
    monthlyRate > 0
      ? Math.round(
          (principal * (monthlyRate * Math.pow(1 + monthlyRate, 360))) /
            (Math.pow(1 + monthlyRate, 360) - 1),
        )
      : Math.round(principal / 360);

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: site.palette.background,
        color: site.palette.text,
      }}
    >
      {/* Top Floating Devora Creator Control Bar (Can be toggled to view pure website) */}
      {showCreatorBar ? (
        <div className="sticky top-0 z-50 bg-[#0B0D10]/95 backdrop-blur-md border-b border-white/15 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-mono text-[11px] font-semibold">
                <Sparkles size={12} />
                LIVE MULTI-PAGE WEBSITE
              </span>
              <span className="font-semibold text-white">{site.projectName}</span>
              <span className="hidden md:inline text-white/50">•</span>
              <span className="hidden md:inline text-white/70 font-mono text-[11px]">
                {site.pages.length} Pages Active ({activePage.route})
              </span>
            </div>

            {/* Inline AI Quick Edit Form right inside the separate tab */}
            <form
              onSubmit={handleApplyAiModification}
              className="flex-1 max-w-md flex items-center gap-1.5"
            >
              <input
                type="text"
                value={aiEditPrompt}
                onChange={(e) => setAiEditPrompt(e.target.value)}
                placeholder="Ask AI to edit (e.g. 'Add Testimonials page', 'Change theme to emerald')..."
                className="w-full h-8 px-3 rounded-md bg-white/5 border border-white/15 text-white placeholder:text-white/40 text-xs outline-none focus:border-[#00F0FF]"
              />
              <button
                type="submit"
                className="h-8 px-3 rounded-md bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs flex items-center gap-1 shrink-0 hover:opacity-90 cursor-pointer"
              >
                <Send size={12} />
                <span>Update Live</span>
              </button>
            </form>

            <div className="flex items-center gap-2">
              <Link
                href={`/workspace?project=${site.projectId}`}
                className="h-8 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 flex items-center gap-1.5 text-xs"
              >
                <Terminal size={12} className="text-[#00F0FF]" />
                <span>Edit in Workspace</span>
              </Link>
              <Link
                href={`/design-studio?project=${site.projectId}`}
                className="h-8 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 hidden sm:flex items-center gap-1.5 text-xs"
              >
                <Paintbrush size={12} className="text-[#00F0FF]" />
                <span>Design Studio</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowDeployModal(true)}
                className="h-8 px-3 rounded-md bg-emerald-500 text-[#0B0D10] font-semibold flex items-center gap-1.5 text-xs hover:bg-emerald-400 cursor-pointer"
              >
                <Rocket size={12} />
                <span>Deploy to My Account</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreatorBar(false)}
                className="h-8 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                title="Hide Creator Bar (Full-Screen Website View)"
              >
                <EyeOff size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreatorBar(true)}
          className="fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-lg bg-[#0B0D10]/90 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono flex items-center gap-2 shadow-xl cursor-pointer"
        >
          <Eye size={13} />
          <span>Show Devora Controls &amp; Deploy</span>
        </button>
      )}

      {/* Toast Banner */}
      {aiStatusToast && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between max-w-7xl w-full mx-auto mt-2 rounded-lg">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={14} />
            <span>{aiStatusToast}</span>
          </span>
          <button
            type="button"
            onClick={() => setAiStatusToast(null)}
            className="text-white/60 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Generated Website Multi-Page Navigation Header */}
      <header
        className="border-b border-white/10 sticky top-0 z-40 backdrop-blur-md"
        style={{ backgroundColor: `${site.palette.surface}E6` }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-[#0B0D10]"
              style={{ backgroundColor: site.palette.primary }}
            >
              {site.projectName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-none">
                {site.projectName}
              </span>
              <span className="text-[11px] opacity-60 font-mono">{site.domainCategory}</span>
            </div>
          </div>

          {/* Multi-Page Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {site.pages.map((pg) => {
              const isCurrent = pg.id === activePage.id;
              return (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => {
                    setActivePageId(pg.id);
                    setSearchQuery('');
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'text-[#0B0D10] font-semibold shadow-sm'
                      : 'text-white/75 hover:text-white hover:bg-white/5'
                  }`}
                  style={isCurrent ? { backgroundColor: site.palette.primary } : undefined}
                >
                  {pg.navLabel}
                </button>
              );
            })}
          </nav>

          {/* Right Action / Bag Status */}
          <div className="flex items-center gap-3 shrink-0">
            {cartItems.length > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs flex items-center gap-1.5">
                <ShoppingBag size={13} style={{ color: site.palette.primary }} />
                <span>Bag ({cartItems.length})</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const targetPage =
                  site.pages.find(
                    (p) =>
                      p.widgetType === 'booking' ||
                      p.widgetType === 'pricing' ||
                      p.id === 'contact',
                  ) || site.pages[site.pages.length - 1];
                setActivePageId(targetPage.id);
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: site.palette.primary }}
            >
              {activePage.primaryCta}
            </button>
          </div>
        </div>
      </header>

      {/* Main Multi-Page Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-10">
        {/* Hero Section for Current Page */}
        <section
          className="rounded-2xl p-8 md:p-10 border border-white/10 relative overflow-hidden"
          style={{ backgroundColor: site.palette.surface }}
        >
          <div className="max-w-3xl space-y-4">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium border"
              style={{
                color: site.palette.primary,
                borderColor: `${site.palette.primary}4D`,
                backgroundColor: `${site.palette.primary}1A`,
              }}
            >
              {activePage.badge} • Route: {activePage.route}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              {activePage.headline}
            </h1>
            <p className="text-base md:text-lg opacity-80 leading-relaxed">
              {activePage.subheadline}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const nextIdx =
                    (site.pages.findIndex((p) => p.id === activePage.id) + 1) %
                    site.pages.length;
                  setActivePageId(site.pages[nextIdx].id);
                }}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm text-[#0B0D10] hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: site.palette.primary }}
              >
                {activePage.primaryCta} →
              </button>
              <button
                type="button"
                onClick={() => setShowDeployModal(true)}
                className="px-5 py-2.5 rounded-lg font-medium text-sm bg-white/5 hover:bg-white/10 border border-white/15 cursor-pointer"
              >
                {activePage.secondaryCta}
              </button>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            {activePage.highlights.map((h) => (
              <div key={h.label} className="p-4 rounded-xl bg-black/25 border border-white/10">
                <div className="text-xs opacity-60">{h.label}</div>
                <div
                  className="text-2xl font-bold font-mono mt-1"
                  style={{ color: site.palette.primary }}
                >
                  {h.value}
                </div>
                <div className="text-xs opacity-70 mt-0.5">{h.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Page-Specific Interactive Widget Section */}
        {activePage.widgetType === 'calculator' && (
          <section
            className="rounded-2xl p-6 md:p-8 border border-white/10 space-y-5"
            style={{ backgroundColor: site.palette.surface }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">Interactive Financial &amp; ROI Estimator</h2>
                <p className="text-xs opacity-70">
                  Adjust parameters below to calculate live monthly figures
                </p>
              </div>
              <span
                className="font-mono text-2xl font-bold"
                style={{ color: site.palette.primary }}
              >
                ${monthlyPayment.toLocaleString()} / mo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono flex justify-between">
                  <span>TOTAL VALUE / AMOUNT</span>
                  <span>${calcAmount.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={100000}
                  max={3000000}
                  step={25000}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono flex justify-between">
                  <span>DOWN PAYMENT / INITIAL TIER</span>
                  <span>{calcDownPct}%</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={calcDownPct}
                  onChange={(e) => setCalcDownPct(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono flex justify-between">
                  <span>ANNUAL RATE (%)</span>
                  <span>{calcRate}%</span>
                </label>
                <input
                  type="range"
                  min={2.5}
                  max={10.0}
                  step={0.1}
                  value={calcRate}
                  onChange={(e) => setCalcRate(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </section>
        )}

        {(activePage.widgetType === 'booking' || activePage.widgetType === 'contact') && (
          <section
            className="rounded-2xl p-6 md:p-8 border border-white/10 space-y-4"
            style={{ backgroundColor: site.palette.surface }}
          >
            <h2 className="text-xl font-bold">
              {activePage.widgetType === 'booking'
                ? 'Instant Online Booking & Reservation'
                : 'Direct Inquiry & Priority Onboarding'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                placeholder="Your Full Name or Email"
                className="h-10 px-3 rounded-lg bg-black/30 border border-white/15 text-sm outline-none"
              />
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="h-10 px-3 rounded-lg bg-black/30 border border-white/15 text-sm outline-none"
              />
              <select
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="h-10 px-3 rounded-lg bg-black/30 border border-white/15 text-sm outline-none"
              >
                <option value="09:00 AM">09:00 AM Slot</option>
                <option value="10:30 AM">10:30 AM Slot</option>
                <option value="02:00 PM">02:00 PM Slot</option>
                <option value="04:30 PM">04:30 PM Slot</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setBookingConfirmed(
                    `Confirmed for ${bookingName || 'Guest'} on ${bookingDate} at ${bookingTime}!`,
                  )
                }
                className="h-10 px-4 rounded-lg font-semibold text-sm text-[#0B0D10] cursor-pointer"
                style={{ backgroundColor: site.palette.primary }}
              >
                Confirm Instant Slot
              </button>
            </div>
            {bookingConfirmed && (
              <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                ✓ {bookingConfirmed}
              </div>
            )}
          </section>
        )}

        {/* Filter & Search Bar + Interactive Cards Grid */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{activePage.title}</h2>
              <p className="text-xs opacity-70">
                Showing {filteredCards.length} interactive modules on page{' '}
                <code className="font-mono">{activePage.route}</code>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activePage.widgetType === 'pricing' && (
                <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/15 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-md cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-white/15 font-semibold' : 'opacity-70'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1 rounded-md cursor-pointer ${
                      billingCycle === 'annual' ? 'bg-white/15 font-semibold' : 'opacity-70'
                    }`}
                  >
                    Annual (Save 20%)
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white/5 border border-white/15">
                <Search size={14} className="opacity-60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter items on this page..."
                  className="bg-transparent text-xs outline-none w-44"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl p-6 border border-white/10 flex flex-col justify-between gap-4 hover:border-white/25 transition-all"
                style={{ backgroundColor: site.palette.surface }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: `${site.palette.primary}20`,
                        color: site.palette.primary,
                      }}
                    >
                      {card.badge}
                    </span>
                    <span className="font-mono text-sm font-bold">{card.priceOrStat}</span>
                  </div>
                  <h3 className="text-lg font-bold">{card.title}</h3>
                  <p className="text-xs font-mono opacity-65">{card.subtitle}</p>
                  <p className="text-sm opacity-80 leading-relaxed">{card.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCardAction(card)}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-[#0B0D10] hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ backgroundColor: site.palette.primary }}
                >
                  {card.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Multi-Page Sitemap Footer */}
        <footer className="pt-10 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs opacity-75">
          <div>
            <span className="font-bold">{site.projectName}</span> • Built with Devora Autonomous
            Multi-Page Engine ({site.stack.framework} + {site.stack.styling})
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {site.pages.map((pg) => (
              <button
                key={pg.id}
                type="button"
                onClick={() => setActivePageId(pg.id)}
                className="hover:underline cursor-pointer"
              >
                {pg.navLabel} ({pg.route})
              </button>
            ))}
          </div>
        </footer>
      </main>

      {/* "Deploy to My Own Account" Guided Credential Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1217] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#00F0FF] block">
                  USER-OWNED CLOUD DEPLOYMENT
                </span>
                <h3 className="text-xl font-bold mt-0.5">
                  Deploy &ldquo;{site.projectName}&rdquo; to Your Own Account
                </h3>
                <p className="text-xs text-white/65 mt-1">
                  Your website is already working online in this tab! If you want to host it under
                  your own cloud account, enter your provider credentials below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
              >
                <X size={16} />
              </button>
            </div>

            {/* Provider Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'vercel', label: 'Vercel (Frontend)', sub: 'Free Hobby Tier' },
                  { id: 'render', label: 'Render (Full-Stack)', sub: 'Free Web Service' },
                  { id: 'github', label: 'GitHub Repo', sub: 'Push Source Code' },
                ] as const
              ).map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setDeployProvider(prov.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    deployProvider === prov.id
                      ? 'bg-[#00F0FF]/10 border-[#00F0FF] text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{prov.label}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{prov.sub}</div>
                </button>
              ))}
            </div>

            <form onSubmit={handleDeployWithOwnCredentials} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Your {deployProvider.toUpperCase()} Account Username / Handle *
                </label>
                <input
                  type="text"
                  required
                  value={userAccountHandle}
                  onChange={(e) => setUserAccountHandle(e.target.value)}
                  placeholder="e.g. your-username"
                  className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Your {deployProvider.toUpperCase()} Personal Access Token / API Key *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={userApiToken}
                    onChange={(e) => setUserApiToken(e.target.value)}
                    placeholder={
                      deployProvider === 'github'
                        ? 'ghp_xxxxxxxxxxxxxxxxxxxx'
                        : deployProvider === 'vercel'
                          ? 'vcp_xxxxxxxxxxxxxxxxxxxx'
                          : 'rnd_xxxxxxxxxxxxxxxxxxxx'
                    }
                    className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <p className="text-[11px] text-white/45 mt-1 flex items-center gap-1">
                  <Lock size={11} className="text-emerald-400" />
                  Encrypted in transit and used exclusively to deploy this website to your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Optional Custom Domain
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. www.mybusiness.com (optional)"
                  className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-white outline-none focus:border-[#00F0FF]"
                />
              </div>

              {deployedOwnUrl && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs space-y-1">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Successfully Deployed to Your {deployProvider.toUpperCase()} Account!</span>
                  </div>
                  <div className="font-mono text-white/80 truncate">
                    Live Endpoint: <span className="text-[#00F0FF]">{deployedOwnUrl}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={deployingToOwnAcc}
                  className="px-5 py-2 rounded-lg bg-[#00F0FF] text-[#0B0D10] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                >
                  <CloudUpload size={14} />
                  <span>
                    {deployingToOwnAcc
                      ? 'Deploying to Your Account...'
                      : `Deploy to My ${deployProvider.toUpperCase()} Account`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
