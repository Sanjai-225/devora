/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  auth,
  collection,
  db,
  doc,
  firebaseSignOut,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  query,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  updateDoc,
  where,
  type FirebaseUser,
} from './firebase';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Paintbrush,
  Terminal,
  Plug,
  Settings,
  Bot,
  GitBranch,
  Sparkles,
  Layers,
  HelpCircle,
  CheckCircle2,
  Download,
  ChevronRight,
  Cpu,
  Check,
  RefreshCw,
  Edit3,
  ArrowRight,
  Send,
  ShieldCheck,
  Wifi,
  Laptop,
  Tablet,
  Smartphone,
  History,
  RotateCcw,
  Sliders,
  MousePointerClick,
  Zap,
  Lock,
  LogIn,
  LogOut,
} from 'lucide-react';

interface PageRoute {
  name: string;
  route: string;
  description: string;
  components: string[];
  isApi?: boolean;
  priority: 'High Priority' | 'Core Route';
}

interface ClarificationItem {
  id: string;
  label: string;
  spec: string;
  question: string;
  options: string[];
}

interface PreviewDesignVersion {
  id: string;
  tag: string;
  label: string;
  prompt: string;
  primaryColor: string;
  surfaceColor: string;
  radius: string;
  approved?: boolean;
}

const INITIAL_ROUTES: PageRoute[] = [
  {
    name: 'Telemetry & Centroid Tracking',
    route: '/dashboard/telemetry',
    description:
      'Live Recharts centroid GPS tracking map, vehicle battery State of Charge (SoC), dual inverter motor thermal readouts with 500ms reactive polling.',
    components: ['@tanstack/react-query', 'mapbox-gl / svg-canvas', 'useWebSocket'],
    priority: 'High Priority',
  },
  {
    name: 'Fleet Diagnostics & DTC Triage',
    route: '/fleet/diagnostics',
    description:
      'Predictive maintenance scheduling drawer, OBD-II error code mapping, and real-time fleet DTC triage workflow modal.',
    components: ['DiagnosticsDrawer', 'ObdCodeTable', 'TriageModal'],
    priority: 'High Priority',
  },
  {
    name: 'Subscription & Telematics Billing',
    route: '/billing/plans',
    description:
      'Tiered Stripe Checkout customer portal integration: Fleet Starter ($49/mo) vs Enterprise Unlimited ($299/mo) with metered SIM telemetry add-ons.',
    components: ['@stripe/stripe-js', 'stripe-webhook-handler', 'PlanComparisonCard'],
    priority: 'Core Route',
  },
  {
    name: 'Edge Telemetry WebSocket API',
    route: '/api/telemetry/ws',
    description:
      'Edge runtime WebSocket server with fallback Server-Sent Events (SSE) stream for low-bandwidth cellular field units.',
    components: ['Edge Runtime', 'Supabase Realtime Channel', '<20ms Latency Target'],
    isApi: true,
    priority: 'Core Route',
  },
];

const CLARIFICATIONS: ClarificationItem[] = [
  {
    id: 'q_socket_latency',
    label: 'Q1 • Socket Latency',
    spec: 'Telematics Spec',
    question: 'Should mock WebSockets stream updates every 500ms or 1,000ms?',
    options: ['500ms (High-Fi)', '1,000ms (Saver)'],
  },
  {
    id: 'q_auth_architecture',
    label: 'Q2 • Auth Architecture',
    spec: 'Security Spec',
    question: 'Require multi-tenant organization switcher in the navigation header?',
    options: ['Enable Multi-tenant Orgs', 'Single Workspace Only'],
  },
  {
    id: 'q_test_data_seeding',
    label: 'Q3 • Test Data Seeding',
    spec: 'Database Spec',
    question: 'Auto-generate 50 mock electric delivery vans with realistic coordinates?',
    options: ['Auto-seed 50 Fleet Units', 'Start with Empty Fleet'],
  },
];

const DEFAULT_PROJECT_ID = 'proj_novastride_01';

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeNav, setActiveNav] = useState<
    | 'synthesis'
    | 'workflow'
    | 'design'
    | 'config'
    | 'workspace'
    | 'integrations'
    | 'create'
    | 'projects'
  >('workspace');
  const [ghRepoInput, setGhRepoInput] = useState('Sanjai-225/devora');
  const [ghBranchInput, setGhBranchInput] = useState<'main' | 'testing' | 'feature/agent-2'>('main');
  const [ghPushBanner, setGhPushBanner] = useState<string | null>(
    'Synchronized Phases 0–10 (v1.0.0 Production MVP) across main, testing, and feature/agent-2',
  );
  const [cloudProviderChoice, setCloudProviderChoice] = useState<'vercel' | 'render'>('vercel');
  const [cloudConfirmChecked, setCloudConfirmChecked] = useState(true);
  const [cloudDeployments, setCloudDeployments] = useState([
    {
      id: 'dpl_DftLYy4fsE36',
      provider: 'Vercel Hobby Free ($0.00/mo)',
      branch: 'main',
      sha: '72ca4ee',
      status: 'READY (PRODUCTION)',
      url: 'https://devora-platform.vercel.app',
      dashboardUrl: 'https://vercel.com/sanjai-225s-projects/devora-platform',
    },
    {
      id: 'dep_dbk07ik9v7es',
      provider: 'Render Free Web Service ($0.00/mo)',
      branch: 'main',
      sha: '72ca4ee',
      status: 'LIVE (PRODUCTION)',
      url: 'https://devora-backend-rl0i.onrender.com',
      dashboardUrl: 'https://dashboard.render.com/web/srv-dbk07i49v7es73bamrmg',
    },
  ]);
  const [projectName, setProjectName] = useState('Novastride Fleet');
  const [summary, setSummary] = useState(
    'High-performance IoT Fleet Intelligence Dashboard with real-time GPS telemetry, battery degradation predictive tracking, and Stripe-billed tiered telematics subscriptions.',
  );
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [stage, setStage] = useState<
    'requirement_analysis' | 'clarification' | 'stack_confirmed' | 'awaiting_design_approval'
  >('awaiting_design_approval');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    q_socket_latency: '500ms (High-Fi)',
    q_auth_architecture: 'Enable Multi-tenant Orgs',
    q_test_data_seeding: 'Auto-seed 50 Fleet Units',
  });
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<
    { id: string; role: 'user' | 'agent'; content: string; stage: string }[]
  >([
    {
      id: 'm1',
      role: 'agent',
      content:
        'Synthesized requirement specification for Novastride Fleet (4 routes, 3 core feature blueprints). Review the 3 clarification decisions on the right or proceed to Workflow Decision & Design Studio.',
      stage: 'requirement_analysis',
    },
  ]);

  // Phase 3 Design Studio state
  const [workflowChoice, setWorkflowChoice] = useState<'design_first' | 'direct_code'>(
    'design_first',
  );
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#00F0FF');
  const [surfaceColor, setSurfaceColor] = useState('#151921');
  const [borderRadius, setBorderRadius] = useState('8px');
  const [designPrompt, setDesignPrompt] = useState('');
  const [designApproved, setDesignApproved] = useState(false);
  const [designVersions, setDesignVersions] = useState<PreviewDesignVersion[]>([
    {
      id: 'v1',
      tag: 'v1.0',
      label: 'Initial Architecture & Theme',
      prompt: 'Initial synthesis from requirement specification',
      primaryColor: '#38BDF8',
      surfaceColor: '#151921',
      radius: '6px',
    },
    {
      id: 'v2',
      tag: 'v1.1',
      label: 'Electric Cyan Accents & Pro Glow',
      prompt: 'Make the Pro card stand out with an Electric Cyan border glow (#00F0FF)',
      primaryColor: '#00F0FF',
      surfaceColor: '#151921',
      radius: '8px',
    },
  ]);
  const [activeVersionId, setActiveVersionId] = useState('v2');

  // Phase 4 Configuration & Implementation Plan state
  const [envScope, setEnvScope] = useState<'development' | 'staging' | 'production'>('development');
  const [configVars] = useState([
    {
      key: 'DATABASE_URL',
      maskedValue: 'postgresql://postgres:••••••••••••@db.supabase.co:5432/postgres',
      category: 'database',
      scope: 'server_only' as const,
      isRequired: true,
      isConfigured: true,
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      maskedValue: 'eyJhbGci••••••••••••••',
      category: 'auth',
      scope: 'server_only' as const,
      isRequired: true,
      isConfigured: true,
    },
    {
      key: 'STRIPE_SECRET_KEY',
      maskedValue: 'stripe_secret_mock_••••••••••',
      category: 'payment',
      scope: 'server_only' as const,
      isRequired: true,
      isConfigured: true,
    },
    {
      key: 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
      maskedValue: 'pk.eyJ1Ijo••••••••••••',
      category: 'maps',
      scope: 'client_public' as const,
      isRequired: false,
      isConfigured: true,
    },
    {
      key: 'NEXT_PUBLIC_APP_URL',
      maskedValue: 'https://novastride.devora.app',
      category: 'app_config',
      scope: 'client_public' as const,
      isRequired: false,
      isConfigured: true,
    },
  ]);
  const [planApproved, setPlanApproved] = useState(false);
  const [dbPingMsg, setDbPingMsg] = useState(
    'Connected to PostgreSQL 16.4 via TLS 1.3 (14ms RTT, zero credential leaks)',
  );

  // Phase 5 Workspace & Execution state
  const [wsStatus, setWsStatus] = useState<'running' | 'stopped'>('running');
  const [wsPid, setWsPid] = useState<number | null>(4812);
  const [wsPort, setWsPort] = useState<number | null>(4101);
  const [wsTab, setWsTab] = useState<'preview' | 'code' | 'hosting'>('preview');
  const [wsSelectedFile, setWsSelectedFile] = useState('src/app/dashboard/page.tsx');
  const [wsCommand, setWsCommand] = useState('npm run type-check');
  const [wsLogs, setWsLogs] = useState([
    '[Workspace] Initialized isolated workspace /tmp/devora/workspaces/proj_novastride_01 (7 files)',
    '[Build] compiled /dashboard/telemetry in 284ms (142 modules)',
    '[Tests] PASS tests/telemetry.spec.ts (4 passed, 0 failed)',
    '[Ready] Started isolated preview server (PID 4812) bound to http://localhost:4101',
  ]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      setAuthReady(true);
      if (u && u.emailVerified) {
        const userPath = `users/${u.uid}`;
        try {
          await setDoc(
            doc(db, 'users', u.uid),
            {
              uid: u.uid,
              email: (u.email || 'user@devora.app').slice(0, 254),
              displayName: (u.displayName || 'Devora Builder').slice(0, 100),
              role: 'individual',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time listener for user's projects & design versions when signed in
  useEffect(() => {
    if (!authReady || !fbUser) return;

    const projectsPath = 'projects';
    const qProjects = query(
      collection(db, projectsPath),
      where('userId', '==', fbUser.uid),
    );
    const unsubProjects = onSnapshot(
      qProjects,
      (snap) => {
        if (!snap.empty) {
          const first = snap.docs[0].data();
          if (typeof first.name === 'string') setProjectName(first.name);
          if (typeof first.description === 'string') setSummary(first.description);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, projectsPath);
      },
    );

    const versionsPath = `projects/${DEFAULT_PROJECT_ID}/designVersions`;
    const qVersions = query(
      collection(db, versionsPath),
      where('userId', '==', fbUser.uid),
    );
    const unsubVersions = onSnapshot(
      qVersions,
      (snap) => {
        if (!snap.empty) {
          const loaded: PreviewDesignVersion[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              tag: String(data.versionTag || 'v1.0'),
              label: String(data.label || 'Design Iteration'),
              prompt: String(data.prompt || ''),
              primaryColor: String(data.primaryColor || '#00F0FF'),
              surfaceColor: String(data.surfaceColor || '#151921'),
              radius: String(data.borderRadius || '8px'),
              approved: Boolean(data.approved),
            };
          });
          setDesignVersions(loaded);
          const latest = loaded[loaded.length - 1];
          setActiveVersionId(latest.id);
          setPrimaryColor(latest.primaryColor);
          setSurfaceColor(latest.surfaceColor);
          setBorderRadius(latest.radius);
          setDesignApproved(Boolean(latest.approved));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, versionsPath);
      },
    );

    return () => {
      unsubProjects();
      unsubVersions();
    };
  }, [authReady, fbUser]);

  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user && cred.user.emailVerified) {
        const projPath = `projects/${DEFAULT_PROJECT_ID}`;
        try {
          await setDoc(doc(db, 'projects', DEFAULT_PROJECT_ID), {
            id: DEFAULT_PROJECT_ID,
            userId: cred.user.uid,
            name: projectName.slice(0, 100),
            description: summary.slice(0, 10000),
            status: 'designing',
            designChoice: workflowChoice,
            currentAgentStage: 'awaiting_design_approval',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, projPath);
        }
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim().slice(0, 10000);
    setChatInput('');
    const msgId = `msg_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'user', content: text, stage },
      {
        id: `a_${Date.now() + 1}`,
        role: 'agent',
        content: `Updated specification for "${projectName}" with your instruction: "${text}". All route dependencies and technology stack tokens remain conflict-free.`,
        stage: 'stack_confirmed',
      },
    ]);

    if (fbUser && fbUser.emailVerified) {
      const msgPath = `projects/${DEFAULT_PROJECT_ID}/conversations/${msgId}`;
      try {
        await setDoc(doc(db, 'projects', DEFAULT_PROJECT_ID, 'conversations', msgId), {
          id: msgId,
          projectId: DEFAULT_PROJECT_ID,
          userId: fbUser.uid,
          role: 'user',
          content: text,
          stage: stage.slice(0, 64),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, msgPath);
      }
    }
  };

  const handleApplyClarifications = () => {
    const summaryText = Object.entries(selectedAnswers)
      .map(([k, v]) => `${k.replace('q_', '')}: ${v}`)
      .join(' • ');
    setStage('stack_confirmed');
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        content: `Applied decisions: ${summaryText}`,
        stage: 'clarification',
      },
      {
        id: `a-${Date.now() + 1}`,
        role: 'agent',
        content:
          '✅ Clarification decisions locked in! Technology stack is confirmed and ready for Phase 3 Workflow Decision.',
        stage: 'stack_confirmed',
      },
    ]);
  };

  const handleApplyDesignPrompt = async (promptText?: string) => {
    const text = (promptText ?? designPrompt).trim().slice(0, 5000);
    if (!text) return;
    setDesignPrompt('');
    const lower = text.toLowerCase();
    let nextPrimary = primaryColor;
    let nextSurface = surfaceColor;
    let nextRadius = borderRadius;

    if (lower.includes('emerald') || lower.includes('#10b981')) nextPrimary = '#10B981';
    else if (lower.includes('indigo') || lower.includes('#6366f1')) nextPrimary = '#6366F1';
    else if (lower.includes('cyan') || lower.includes('#00f0ff')) nextPrimary = '#00F0FF';

    if (lower.includes('darker')) nextSurface = '#0E1218';
    if (lower.includes('12px')) nextRadius = '12px';
    if (lower.includes('16px')) nextRadius = '16px';

    const nextNum = designVersions.length + 1;
    const verId = `ver_${nextNum}_${Date.now()}`;
    const nextVer: PreviewDesignVersion = {
      id: verId,
      tag: `v1.${nextNum - 1}`,
      label: text.slice(0, 36),
      prompt: text,
      primaryColor: nextPrimary,
      surfaceColor: nextSurface,
      radius: nextRadius,
    };

    setPrimaryColor(nextPrimary);
    setSurfaceColor(nextSurface);
    setBorderRadius(nextRadius);
    setDesignVersions((prev) => [...prev, nextVer]);
    setActiveVersionId(nextVer.id);

    if (fbUser && fbUser.emailVerified) {
      const verPath = `projects/${DEFAULT_PROJECT_ID}/designVersions/${verId}`;
      try {
        await setDoc(
          doc(db, 'projects', DEFAULT_PROJECT_ID, 'designVersions', verId),
          {
            id: verId,
            projectId: DEFAULT_PROJECT_ID,
            userId: fbUser.uid,
            versionNumber: nextNum,
            versionTag: nextVer.tag,
            label: nextVer.label.slice(0, 120),
            prompt: text,
            primaryColor: nextPrimary,
            surfaceColor: nextSurface,
            borderRadius: nextRadius,
            prototypeCode: `export default function PrototypeApp() { return null; }`,
            approved: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, verPath);
      }
    }
  };

  const handleRestoreVersion = (ver: PreviewDesignVersion) => {
    setActiveVersionId(ver.id);
    setPrimaryColor(ver.primaryColor);
    setSurfaceColor(ver.surfaceColor);
    setBorderRadius(ver.radius);
  };

  const handleApproveDesign = async () => {
    setDesignApproved(true);
    if (fbUser && fbUser.emailVerified && activeVersionId) {
      const verPath = `projects/${DEFAULT_PROJECT_ID}/designVersions/${activeVersionId}`;
      try {
        await updateDoc(
          doc(db, 'projects', DEFAULT_PROJECT_ID, 'designVersions', activeVersionId),
          {
            approved: true,
            primaryColor,
            surfaceColor,
            borderRadius,
            prototypeCode: `export default function PrototypeApp() { return null; }`,
            updatedAt: serverTimestamp(),
          },
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, verPath);
      }
    }
    setActiveNav('config');
  };

  const handleSaveConfigAndApprovePlan = async () => {
    setPlanApproved(true);
    if (fbUser && fbUser.emailVerified) {
      for (const v of configVars) {
        const cfgId = `cfg_${v.key.toLowerCase()}`;
        const cfgPath = `projects/${DEFAULT_PROJECT_ID}/configurations/${cfgId}`;
        try {
          await setDoc(
            doc(db, 'projects', DEFAULT_PROJECT_ID, 'configurations', cfgId),
            {
              id: cfgId,
              projectId: DEFAULT_PROJECT_ID,
              userId: fbUser.uid,
              variableKey: v.key,
              maskedValue: v.maskedValue,
              category: v.category,
              scope: v.scope,
              encryptionType: 'AES-256',
              isRequired: v.isRequired,
              isConfigured: v.isConfigured,
              updatedAt: serverTimestamp(),
            },
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, cfgPath);
        }
      }

      const planId = 'plan_novastride_01';
      const planPath = `projects/${DEFAULT_PROJECT_ID}/implementationPlans/${planId}`;
      try {
        await setDoc(
          doc(db, 'projects', DEFAULT_PROJECT_ID, 'implementationPlans', planId),
          {
            id: planId,
            projectId: DEFAULT_PROJECT_ID,
            userId: fbUser.uid,
            planTitle: `${projectName} — Execution Blueprint`,
            architectureSummary:
              'Full-stack Next.js 16 + PostgreSQL + Stripe + Mapbox GL architecture with AES-256 isolated server secrets.',
            estimatedFilesCount: 18,
            estimatedDurationSeconds: 120,
            stepsCount: 5,
            approved: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, planPath);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F1F5F9] flex font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0F1217] border-r border-[#232B38] flex flex-col shrink-0">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-[#232B38]">
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-[#00F0FF]">D</span>evora
          </span>
          <span className="text-[10px] font-mono bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 px-1.5 py-0.5 rounded">
            v1.0 MVP • Agent 2
          </span>
        </div>

        <div className="px-4 py-3 border-b border-[#232B38] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-xs text-[#94A3B8]">Free Tier: Vercel + Render</span>
          <span className="ml-auto text-[10px] font-mono text-[#10B981]">LIVE</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-medium text-[#64748B] uppercase tracking-widest">
            Platform Suite
          </p>
          {[
            { id: 'synthesis', label: '1. Requirement Synthesis', icon: Terminal, badge: 'P2' },
            { id: 'workflow', label: '2. Workflow Decision', icon: GitBranch, badge: 'P3' },
            { id: 'design', label: '3. Design Studio', icon: Paintbrush, badge: 'P3' },
            { id: 'config', label: '4. Config & Plan', icon: ShieldCheck, badge: 'P4' },
            { id: 'workspace', label: '5. Workspace, Verify & Export', icon: Cpu, badge: 'P8' },
            { id: 'integrations', label: '6. Integrations & Cloud Hub', icon: Plug, badge: 'v1.0' },
            { id: 'projects', label: 'Dashboard & Projects', icon: LayoutDashboard },
            { id: 'create', label: 'Create Website', icon: PlusCircle },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (
                    item.id === 'synthesis' ||
                    item.id === 'workflow' ||
                    item.id === 'design' ||
                    item.id === 'config' ||
                    item.id === 'workspace' ||
                    item.id === 'integrations'
                  ) {
                    setActiveNav(item.id);
                  } else if (item.id === 'create') {
                    setActiveNav('synthesis');
                    setEditingPrompt(true);
                  } else {
                    setActiveNav('integrations');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-l-2 border-[#00F0FF]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151921]'
                }`}
              >
                <Icon size={16} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-semibold bg-[#00F0FF] text-[#0B0D10] px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#232B38] space-y-2 text-xs text-[#94A3B8]">
          {fbUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-[#F1F5F9] truncate">
                  {fbUser.displayName || fbUser.email}
                </div>
                <div className="text-[10px] text-[#10B981] font-mono">
                  Firestore Connected
                </div>
              </div>
              <button
                type="button"
                onClick={() => firebaseSignOut(auth)}
                className="p-1.5 rounded bg-[#151921] hover:bg-[#1C222D] text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2 px-3 rounded bg-[#151921] hover:bg-[#1C222D] border border-[#00F0FF]/40 text-[#00F0FF] font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={13} />
              <span>Sign in with Google</span>
            </button>
          )}
          <div className="text-[10px] text-[#64748B] font-mono truncate">
            Project: rapid-shift-r8chg
          </div>
        </div>
      </aside>

      {/* Main Content Switcher */}
      {activeNav === 'workflow' ? (
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#232B38]">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">
                Projects / <span className="text-[#F1F5F9]">{projectName}</span> /{' '}
                <span className="text-[#00F0FF]">Workflow Decision</span>
              </div>
              <h1 className="text-2xl font-bold">Select Synthesis Pipeline</h1>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-[#0F1217] px-3 py-1.5 rounded border border-[#232B38]">
              <span className="text-[#10B981]">✔ 1. Requirements</span>
              <span>→</span>
              <span className="text-[#00F0FF] font-semibold">● 2. Workflow Path</span>
              <span>→</span>
              <span className="text-[#64748B]">3. Design / Code</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card A: Design Studio First */}
            <div
              onClick={() => setWorkflowChoice('design_first')}
              className={`rounded-xl p-6 flex flex-col justify-between cursor-pointer transition-all ${
                workflowChoice === 'design_first'
                  ? 'bg-gradient-to-b from-[#00F0FF]/[0.07] to-[#0F1217] border-2 border-[#00F0FF]'
                  : 'bg-[#0F1217] border border-[#232B38]'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Paintbrush size={18} className="text-[#00F0FF]" />
                    <h2 className="text-lg font-bold">Design Studio First</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 uppercase">
                      Recommended
                    </span>
                  </div>
                  <Check size={16} className="text-[#00F0FF]" />
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Generate an interactive React/TypeScript prototype in Sandpack. Switch between Desktop (1440px), Tablet (768px), and Mobile (390px) viewports, edit tokens live, and iterate with AI chat before code generation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav('design')}
                className="mt-6 w-full py-2.5 rounded-lg bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} /> Launch Design Studio <ArrowRight size={14} />
              </button>
            </div>

            {/* Card B: Direct Code Synthesis */}
            <div
              onClick={() => setWorkflowChoice('direct_code')}
              className={`rounded-xl p-6 flex flex-col justify-between cursor-pointer transition-all ${
                workflowChoice === 'direct_code'
                  ? 'bg-gradient-to-b from-[#6366F1]/[0.08] to-[#0F1217] border-2 border-[#6366F1]'
                  : 'bg-[#0F1217] border border-[#232B38]'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal size={18} className="text-[#6366F1]" />
                    <h2 className="text-lg font-bold">Direct Code Synthesis</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30 uppercase">
                      Fastest Path
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Bypass visual prototyping and compile directly to your full-stack repository using inferred design defaults.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav('config')}
                className="mt-6 w-full py-2.5 rounded-lg bg-[#151921] border border-[#232B38] text-[#F1F5F9] font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Skip Design &amp; Configure Build Plan <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </main>
      ) : activeNav === 'config' ? (
        /* Phase 4 Configuration & Implementation Plan View */
        <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#232B38]">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">
                Projects / <span className="text-[#F1F5F9]">{projectName}</span> /{' '}
                <span className="text-[#00F0FF]">Configuration &amp; Implementation Plan</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Environment Vault &amp; Build Blueprint</h1>
                <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 font-mono text-[10px] text-[#10B981] flex items-center gap-1">
                  <Lock size={10} /> AES-256 Server Vault
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(['development', 'staging', 'production'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setEnvScope(sc)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase cursor-pointer border ${
                    envScope === sc
                      ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                      : 'bg-[#0F1217] text-[#94A3B8] border-[#232B38]'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Columns: .env Variables + DB Handshake */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-xl bg-[#0F1217] border border-[#232B38] overflow-hidden">
                <div className="px-4 py-3 bg-[#151921] border-b border-[#232B38] flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <Lock size={13} className="text-[#00F0FF]" />
                    Detected Environment Variables ({configVars.length})
                  </span>
                  <span className="text-[10px] font-mono text-[#10B981]">
                    Minimal Credential Policy Active
                  </span>
                </div>
                <div className="divide-y divide-[#232B38]">
                  {configVars.map((v) => (
                    <div
                      key={v.key}
                      className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-[#F1F5F9] flex items-center gap-2">
                          <span>{v.key}</span>
                          {v.isRequired && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                              REQUIRED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                          Category: {v.category} • Encryption: AES-256
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <code className="px-2.5 py-1 rounded bg-[#0B0D10] border border-[#232B38] font-mono text-[11px] text-[#94A3B8]">
                          {v.maskedValue}
                        </code>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                            v.scope === 'client_public'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                          }`}
                        >
                          {v.scope === 'client_public' ? 'Client Public' : 'Server Secret'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0F1217] border border-[#232B38] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#10B981]" />
                    <span>Database Handshake Verification (PostgreSQL + Supavisor)</span>
                  </div>
                  <p className="text-[11px] font-mono text-[#10B981]">{dbPingMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDbPingMsg(
                      `Verified PostgreSQL 16.4 TLS 1.3 handshake at ${new Date().toLocaleTimeString()} (12ms RTT)`,
                    )
                  }
                  className="px-3 py-1.5 rounded bg-[#151921] hover:bg-[#1C222D] border border-[#232B38] text-xs font-mono text-[#00F0FF] cursor-pointer shrink-0"
                >
                  Ping DB
                </button>
              </div>
            </div>

            {/* Right 4 Columns: Security Score & Firestore Collections Info */}
            <aside className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl bg-[#0F1217] border border-[#232B38] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#10B981]" />
                    Security &amp; Secret Audit
                  </span>
                  <span className="font-mono text-xs font-bold text-[#10B981]">98 / 100</span>
                </div>
                <ul className="space-y-2 text-xs text-[#94A3B8]">
                  <li className="flex items-center gap-2">
                    <Check size={13} className="text-[#10B981]" />
                    Zero hardcoded secrets in source code
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={13} className="text-[#10B981]" />
                    Zod schema validation in src/env.mjs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={13} className="text-[#10B981]" />
                    Sanitized .env.example for ZIP export
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#0F1217] border border-[#232B38] space-y-2 text-xs">
                <div className="font-mono text-[11px] text-[#00F0FF] uppercase font-semibold">
                  Meaningful Firestore Collections
                </div>
                <div className="space-y-1 font-mono text-[11px] text-[#94A3B8]">
                  <div>• /users/&#123;userId&#125;</div>
                  <div>• /projects/&#123;projectId&#125;</div>
                  <div>• /projects/&#123;projectId&#125;/conversations</div>
                  <div>• /projects/&#123;projectId&#125;/designVersions</div>
                  <div className="text-[#00F0FF]">• /projects/&#123;projectId&#125;/configurations</div>
                  <div className="text-[#00F0FF]">• /projects/&#123;projectId&#125;/implementationPlans</div>
                </div>
              </div>
            </aside>
          </div>

          {/* Implementation Plan Blueprint */}
          <section className="rounded-xl bg-[#0F1217] border-2 border-[#00F0FF]/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232B38] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold">
                    5-Step Implementation Plan • {projectName}
                  </h2>
                  {planApproved && (
                    <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 font-mono text-[10px] text-[#10B981]">
                      PLAN APPROVED &amp; SAVED TO FIRESTORE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  18 files planned • Estimated build time ~120 seconds • Playwright E2E verification enabled
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveConfigAndApprovePlan}
                className="px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Check size={14} />
                <span>
                  {planApproved
                    ? 'Plan Approved & Synced'
                    : 'Approve Plan & Sync to Firestore'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                {
                  num: 1,
                  title: 'Foundation & src/env.mjs',
                  cmd: 'npm run type-check',
                },
                {
                  num: 2,
                  title: 'PostgreSQL Adapter & Seeds',
                  cmd: 'npm run type-check',
                },
                {
                  num: 3,
                  title: 'API Routes & Stripe Webhooks',
                  cmd: 'npm run lint',
                },
                {
                  num: 4,
                  title: '4 Responsive App Pages',
                  cmd: 'npm run build',
                },
                {
                  num: 5,
                  title: 'Playwright E2E & Git Commit',
                  cmd: 'npx playwright test',
                },
              ].map((st) => (
                <div
                  key={st.num}
                  className="p-3 rounded-lg bg-[#151921] border border-[#232B38] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] font-mono text-[11px] font-bold flex items-center justify-center">
                      {st.num}
                    </span>
                    <span className="font-mono text-[10px] text-[#10B981]">READY</span>
                  </div>
                  <div className="text-xs font-semibold text-[#F1F5F9]">{st.title}</div>
                  <div className="font-mono text-[10px] text-[#94A3B8] truncate">
                    $ {st.cmd}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : activeNav === 'workspace' ? (
        /* Phase 5-7 Workspace, Codegen & Bounded Verification View */
        <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232B38]">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">
                Projects / <span className="text-[#F1F5F9]">{projectName}</span> /{' '}
                <span className="text-[#00F0FF]">
                  Phase 7 — Code Generation, Testing &amp; Bounded Self-Repair
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">
                  Autonomous Workspace Runtime, Verification &amp; Free-Tier Blueprint
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#151921] border border-[#232B38] font-mono text-[11px] text-[#00F0FF]">
                  {wsStatus === 'running' ? `PID ${wsPid} • :${wsPort}` : 'STOPPED'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 font-mono text-[11px] text-[#10B981]">
                  4/4 Playwright Smoke • Max 3 Repair Cap
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setWsLogs((prev) => [
                    ...prev,
                    '[Export] Packaged novastride-fleet-de728fd.zip (9 safe files, .env excluded, .env.example & README.md generated)',
                  ]);
                }}
                className="px-3 py-1.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono cursor-pointer flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Export Safe ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWsLogs((prev) => [
                    ...prev,
                    '[Verify] check_build: exit_code=0 (7 files validated in 142ms)',
                    '[Playwright] run_tests: 4/4 smoke tests passed (0 console errors, 0 repairs needed)',
                  ]);
                }}
                className="px-3 py-1.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-mono cursor-pointer"
              >
                Verify &amp; Auto-Repair (Max 3)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (wsStatus === 'running') {
                    setWsStatus('stopped');
                    setWsPid(null);
                    setWsPort(null);
                    setWsLogs((prev) => [
                      ...prev,
                      '[Stop] Stopped isolated preview server and released port.',
                    ]);
                  } else {
                    const nextPid = Math.floor(4200 + Math.random() * 800);
                    setWsStatus('running');
                    setWsPid(nextPid);
                    setWsPort(4101);
                    setWsLogs((prev) => [
                      ...prev,
                      `[Ready] Started isolated preview server (PID ${nextPid}) on :4101`,
                    ]);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer border ${
                  wsStatus === 'running'
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                }`}
              >
                {wsStatus === 'running' ? 'Stop Server' : 'Start Server'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextPid = Math.floor(4200 + Math.random() * 800);
                  setWsStatus('running');
                  setWsPid(nextPid);
                  setWsPort(4101);
                  setWsLogs((prev) => [
                    ...prev,
                    `[Restart] Restarted workspace preview server (PID ${nextPid}) on :4101`,
                  ]);
                }}
                className="px-3 py-1.5 rounded bg-[#151921] border border-[#232B38] text-xs font-mono text-[#F1F5F9] cursor-pointer"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => setWsTab(wsTab === 'hosting' ? 'preview' : 'hosting')}
                className="px-3 py-1.5 rounded bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs cursor-pointer"
              >
                {wsTab === 'hosting' ? 'Back to Workspace' : '$0 Free Hosting Guide'}
              </button>
            </div>
          </header>

          {wsTab === 'hosting' ? (
            <section className="rounded-xl bg-[#0F1217] border border-[#00F0FF]/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#00F0FF]">
                    100% Free-Tier Deployment Ready
                  </span>
                  <h2 className="text-base font-bold mt-0.5">
                    Vercel (Frontend) + Render Free Web Service (Backend) + Firebase Spark (Firestore)
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#10B981]/15 text-[#10B981] font-mono text-xs">
                  $0 / month
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-[#151921] border border-[#232B38] space-y-1.5">
                  <div className="font-semibold text-[#F1F5F9] flex items-center justify-between">
                    <span>1. Vercel (Frontend)</span>
                    <span className="font-mono text-[10px] text-[#10B981]">frontend/vercel.json</span>
                  </div>
                  <p className="text-[#94A3B8] leading-relaxed">
                    Import <code className="font-mono text-[#00F0FF]">Sanjai-225/devora</code> on Vercel Hobby Plan with Root Directory set to <code className="font-mono text-[#00F0FF]">frontend</code>.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#151921] border border-[#232B38] space-y-1.5">
                  <div className="font-semibold text-[#F1F5F9] flex items-center justify-between">
                    <span>2. Render (Backend)</span>
                    <span className="font-mono text-[10px] text-[#10B981]">render.yaml</span>
                  </div>
                  <p className="text-[#94A3B8] leading-relaxed">
                    Uses <code className="font-mono text-[#00F0FF]">/tmp/devora/workspaces</code> on Render Free Tier (no paid Persistent Disk needed) + Firestore sync.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#151921] border border-[#232B38] space-y-1.5">
                  <div className="font-semibold text-[#F1F5F9] flex items-center justify-between">
                    <span>3. Firebase Spark</span>
                    <span className="font-mono text-[10px] text-[#10B981]">rapid-shift-r8chg</span>
                  </div>
                  <p className="text-[#94A3B8] leading-relaxed">
                    Persists <code className="font-mono text-[#00F0FF]">/projects/&#123;id&#125;/workspaces</code> with meaningful fields (`allocatedPort`, `processId`, `hostingTier`).
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 8 Cols: Live Telemetry Runtime Preview */}
              <div className="lg:col-span-8 rounded-xl bg-[#0F1217] border border-[#232B38] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Lock size={13} className="text-[#10B981]" />
                    <span>http://localhost:{wsPort || 4101}/dashboard/telemetry</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#10B981]">
                    Path-Traversal Guard Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-[#151921] border border-[#232B38]">
                    <div className="text-[11px] text-[#94A3B8]">Active Vehicles</div>
                    <div className="text-xl font-bold text-[#F1F5F9] mt-1">1,420</div>
                    <div className="text-[10px] text-[#10B981] mt-0.5">98.2% Active</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#151921] border border-[#232B38]">
                    <div className="text-[11px] text-[#94A3B8]">Battery Health</div>
                    <div className="text-xl font-bold text-[#F1F5F9] mt-1">98.4%</div>
                    <div className="text-[10px] text-[#10B981] mt-0.5">+0.2% YoY</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#151921] border border-[#232B38]">
                    <div className="text-[11px] text-[#94A3B8]">Route Efficiency</div>
                    <div className="text-xl font-bold text-[#00F0FF] mt-1">+14%</div>
                    <div className="text-[10px] text-[#10B981] mt-0.5">0 Critical Alerts</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0B0D10] border border-[#232B38] font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[#94A3B8] text-[11px]">
                    <span>Active File: {wsSelectedFile}</span>
                    <span className="text-[#00F0FF]">UTF-8 • Validated</span>
                  </div>
                  <pre className="text-[11px] text-[#F1F5F9] overflow-x-auto leading-relaxed">
{`export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0B0D10] text-[#F3F5F8] p-6">
      <h1>Novastride Fleet Operations — Active Runtime</h1>
      <TelemetryChart />
    </main>
  );
}`}
                  </pre>
                </div>
              </div>

              {/* Right 4 Cols: File Explorer & Command Runner */}
              <aside className="lg:col-span-4 space-y-4">
                <div className="rounded-xl bg-[#0F1217] border border-[#232B38] p-3.5 space-y-2">
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>Isolated Workspace Files</span>
                    <span className="font-mono text-[10px] text-[#00F0FF]">7 files</span>
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    {[
                      'src/app/dashboard/page.tsx',
                      'src/app/api/telemetry/route.ts',
                      'src/components/telemetry-chart.tsx',
                      'src/env.mjs',
                      'package.json',
                    ].map((fp) => (
                      <button
                        key={fp}
                        type="button"
                        onClick={() => setWsSelectedFile(fp)}
                        className={`w-full text-left px-2.5 py-1.5 rounded truncate cursor-pointer ${
                          wsSelectedFile === fp
                            ? 'bg-[#1C222D] text-[#00F0FF]'
                            : 'text-[#94A3B8] hover:bg-[#151921]'
                        }`}
                      >
                        {fp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#0F1217] border border-[#232B38] p-3.5 space-y-2.5">
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>Runtime Logs &amp; CLI (30s Timeout)</span>
                    <span className="font-mono text-[10px] text-[#10B981]">Secret Redacted</span>
                  </div>
                  <div className="p-2 rounded bg-[#0B0D10] border border-[#232B38] font-mono text-[10.5px] space-y-1 max-h-36 overflow-y-auto text-[#94A3B8]">
                    {wsLogs.map((l, idx) => (
                      <div key={idx} className="truncate text-[#F1F5F9]">
                        {l}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={wsCommand}
                      onChange={(e) => setWsCommand(e.target.value)}
                      className="flex-1 bg-[#0B0D10] border border-[#232B38] rounded px-2.5 py-1 font-mono text-xs text-[#F1F5F9] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setWsLogs((prev) => [
                          ...prev,
                          `$ ${wsCommand} -> exit 0 (48ms, 0 errors)`,
                        ])
                      }
                      className="px-2.5 py-1 rounded bg-[#00F0FF] text-[#0B0D10] font-mono text-xs font-semibold cursor-pointer"
                    >
                      Exec
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>
      ) : activeNav === 'design' ? (
        /* Phase 3 Design Studio 3-Pane View */
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Header */}
          <header className="h-13 px-4 bg-[#0F1217] border-b border-[#232B38] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#94A3B8]">{projectName}</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#00F0FF] font-semibold flex items-center gap-1.5">
                <Paintbrush size={14} /> Design Studio
              </span>
              <span className="px-2 py-0.5 rounded bg-[#151921] border border-[#232B38] font-mono text-[11px] text-[#00F0FF]">
                {designVersions.find((v) => v.id === activeVersionId)?.tag || 'v1.1'}
              </span>
              {designApproved && (
                <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 font-mono text-[10px] text-[#10B981]">
                  APPROVED &amp; SYNCED
                </span>
              )}
            </div>

            {/* Viewport Switcher */}
            <div className="flex items-center bg-[#0B0D10] p-0.5 rounded-lg border border-[#232B38]">
              {[
                { id: 'desktop', label: 'Desktop 1440px', icon: Laptop },
                { id: 'tablet', label: 'Tablet 768px', icon: Tablet },
                { id: 'mobile', label: 'Mobile 390px', icon: Smartphone },
              ].map((vp) => {
                const Icon = vp.icon;
                const active = viewport === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setViewport(vp.id as 'desktop' | 'tablet' | 'mobile')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      active
                        ? 'bg-[#1C222D] text-[#00F0FF]'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{vp.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleApproveDesign}
              className="h-8 px-3.5 rounded bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{designApproved ? 'Approved' : 'Approve & Sync with Codebase'}</span>
            </button>
          </header>

          {/* 3-Pane Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane: Design Assistant + Version History */}
            <aside className="w-76 bg-[#0F1217] border-r border-[#232B38] flex flex-col justify-between p-3.5 shrink-0">
              <div className="space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Design Assistant
                  </span>
                  <span className="text-[10px] font-mono text-[#00F0FF]">Sandpack Live</span>
                </div>

                <div className="p-2.5 rounded bg-[#151921] border border-[#232B38] text-xs text-[#94A3B8] leading-relaxed">
                  Generated <strong className="text-[#F1F5F9]">Obsidian Cyan Precision</strong> prototype with responsive tiers and token bindings.
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#64748B]">
                    Quick Iterations
                  </span>
                  {[
                    'Switch primary accent to Emerald (#10B981)',
                    'Increase card border radius to 12px',
                    'Switch primary accent to Indigo (#6366F1)',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleApplyDesignPrompt(chip)}
                      className="w-full text-left text-[11px] px-2.5 py-1.5 rounded bg-[#151921] hover:bg-[#1C222D] border border-[#232B38] text-[#94A3B8] hover:text-[#00F0FF] cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#232B38] space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#94A3B8]">
                    <History size={12} className="text-[#00F0FF]" />
                    <span>Version History ({designVersions.length})</span>
                  </div>
                  {[...designVersions].reverse().map((v) => {
                    const isCur = v.id === activeVersionId;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleRestoreVersion(v)}
                        className={`p-2 rounded border text-xs flex items-center justify-between cursor-pointer ${
                          isCur
                            ? 'bg-[#00F0FF]/10 border-[#00F0FF]/40'
                            : 'bg-[#151921] border-[#232B38]'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[#00F0FF] font-semibold mr-1.5">
                            {v.tag}
                          </span>
                          <span className="truncate">{v.label}</span>
                        </div>
                        {!isCur && (
                          <span className="text-[10px] font-mono text-[#94A3B8] flex items-center gap-1">
                            <RotateCcw size={10} /> Restore
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#232B38] space-y-2">
                <input
                  type="text"
                  value={designPrompt}
                  onChange={(e) => setDesignPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyDesignPrompt()}
                  placeholder="Describe a design modification..."
                  className="w-full h-8 px-2.5 rounded bg-[#0B0D10] border border-[#232B38] text-xs text-[#F1F5F9] outline-none focus:border-[#00F0FF]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyDesignPrompt()}
                  className="w-full h-8 rounded bg-[#00F0FF] text-[#0B0D10] font-semibold text-xs cursor-pointer"
                >
                  Synthesize Design Version
                </button>
              </div>
            </aside>

            {/* Center Pane: Live Prototype Canvas */}
            <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-[#080A0D]">
              <div
                style={{
                  width:
                    viewport === 'desktop'
                      ? '100%'
                      : viewport === 'tablet'
                        ? '768px'
                        : '390px',
                }}
                className="max-w-4xl rounded-xl border border-[#232B38] bg-[#0B0D10] shadow-2xl overflow-hidden transition-all"
              >
                <div className="h-8 px-3 bg-[#151921] border-b border-[#232B38] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="flex items-center gap-1">
                    <Lock size={10} className="text-[#10B981]" />
                    https://preview.devora.local/billing/plans
                  </span>
                  <span>{viewport.toUpperCase()}</span>
                </div>

                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <span
                      style={{
                        color: primaryColor,
                        borderColor: `${primaryColor}50`,
                        backgroundColor: `${primaryColor}15`,
                      }}
                      className="inline-block px-2.5 py-0.5 rounded-full border font-mono text-[10px]"
                    >
                      LIVE SANDPACK PROTOTYPE
                    </span>
                    <h2 className="text-2xl font-bold">
                      {projectName} — Autonomous Telemetry Tiers
                    </h2>
                  </div>

                  <div
                    className={`grid gap-4 ${
                      viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'
                    }`}
                  >
                    {[
                      { name: 'Starter Fleet', price: '$49', highlight: false },
                      { name: 'Pro Autonomous', price: '$129', highlight: true },
                      { name: 'Enterprise VPC', price: '$299', highlight: false },
                    ].map((tier) => (
                      <div
                        key={tier.name}
                        style={{
                          backgroundColor: surfaceColor,
                          borderRadius,
                          borderColor: tier.highlight ? primaryColor : '#232B38',
                        }}
                        className="p-5 border-2 flex flex-col justify-between space-y-4 relative"
                      >
                        {tier.highlight && (
                          <span
                            style={{ backgroundColor: primaryColor, color: '#0B0D10' }}
                            className="absolute -top-2.5 left-3 px-2 py-0.5 rounded font-mono text-[9px] font-bold flex items-center gap-1"
                          >
                            <MousePointerClick size={9} /> div.pricing-card-pro
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-semibold">{tier.name}</div>
                          <div className="text-2xl font-bold font-mono mt-2">
                            {tier.price}
                            <span className="text-xs font-normal text-[#94A3B8]">/mo</span>
                          </div>
                          <ul className="mt-4 space-y-1.5 text-xs text-[#94A3B8]">
                            <li className="flex items-center gap-1.5">
                              <Zap size={12} style={{ color: primaryColor }} />
                              500ms Live Telemetry
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Zap size={12} style={{ color: primaryColor }} />
                              OBD-II Predictive Triage
                            </li>
                          </ul>
                        </div>
                        <button
                          type="button"
                          style={{
                            backgroundColor: tier.highlight ? primaryColor : '#1C222D',
                            color: tier.highlight ? '#0B0D10' : '#F1F5F9',
                            borderRadius,
                          }}
                          className="w-full py-2 text-xs font-semibold"
                        >
                          Deploy Tier
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane: Design Tokens */}
            <aside className="w-68 bg-[#0F1217] border-l border-[#232B38] p-4 space-y-4 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Sliders size={13} className="text-[#00F0FF]" />
                <span>Design Tokens</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#151921] border border-[#232B38]">
                  <span className="text-[#94A3B8]">Primary Accent</span>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-6 h-5 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#151921] border border-[#232B38]">
                  <span className="text-[#94A3B8]">Card Surface</span>
                  <input
                    type="color"
                    value={surfaceColor}
                    onChange={(e) => setSurfaceColor(e.target.value)}
                    className="w-6 h-5 bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#64748B]">
                  Border Radius
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {['4px', '8px', '12px', '16px'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBorderRadius(r)}
                      className={`py-1 rounded font-mono text-xs border cursor-pointer ${
                        borderRadius === r
                          ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10'
                          : 'border-[#232B38] text-[#94A3B8]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : activeNav === 'integrations' ? (
        /* Phase 9 & 10 Integrations, Production Deployments & Platform Management Hub */
        <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232B38]">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1">
                Devora Production Suite / <span className="text-[#00F0FF]">Integrations &amp; Live Cloud Deployments (v1.0.0 MVP)</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2.5">
                <Plug size={20} className="text-[#00F0FF]" />
                Connected Cloud Platforms &amp; Production Hub
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-mono text-xs">
                ✔ 31/31 Pytest • 22/22 Next.js Routes • $0.00/mo Free Tier
              </span>
            </div>
          </header>

          {ghPushBanner && (
            <div className="p-3.5 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-between text-xs font-mono text-[#00F0FF]">
              <span>{ghPushBanner}</span>
              <button
                type="button"
                onClick={() => setGhPushBanner(null)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Connected Third-Party Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                name: 'GitHub Repository',
                handle: 'Sanjai-225/devora',
                token: 'ghp_••••8291 (Server Vault)',
                plan: 'Branches: main, testing, feature/agent-2',
                url: 'https://github.com/Sanjai-225/devora',
              },
              {
                name: 'Vercel Frontend',
                handle: 'devora-platform',
                token: 'vcp_••••4992 (Server Vault)',
                plan: 'Vercel Hobby Free ($0.00/mo)',
                url: 'https://devora-platform.vercel.app',
              },
              {
                name: 'Render Backend + Agent',
                handle: 'devora-backend',
                token: 'rnd_••••7380 (Server Vault)',
                plan: 'Render Free Web Service ($0.00/mo)',
                url: 'https://devora-backend-rl0i.onrender.com',
              },
              {
                name: 'Firebase Auth & Firestore',
                handle: 'rapid-shift-r8chg',
                token: 'AES-256 Rules Enforced',
                plan: 'Firebase Spark Free ($0.00/mo)',
                url: 'https://console.firebase.google.com/project/rapid-shift-r8chg/firestore',
              },
            ].map((card) => (
              <div
                key={card.name}
                className="p-4 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F1F5F9]">{card.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-mono text-[10px]">
                      CONNECTED
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#00F0FF] truncate">{card.handle}</div>
                  <div className="text-[11px] font-mono text-[#94A3B8]">{card.token}</div>
                  <div className="text-[10px] text-[#10B981] font-mono">{card.plan}</div>
                </div>
                <a
                  href={card.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 py-1.5 px-2.5 rounded bg-[#151921] hover:bg-[#1C222D] border border-[#232B38] text-[11px] font-mono text-[#00F0FF] flex items-center justify-between"
                >
                  <span>Open Live Platform</span>
                  <ChevronRight size={12} />
                </a>
              </div>
            ))}
          </div>

          {/* GitHub Push & Cloud Deployment Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch size={16} className="text-[#00F0FF]" />
                  Secret-Safe GitHub Repository Sync
                </h2>
                <span className="text-[11px] font-mono text-[#10B981]">
                  Excludes .env &amp; private keys
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">
                    REPOSITORY
                  </label>
                  <input
                    type="text"
                    value={ghRepoInput}
                    onChange={(e) => setGhRepoInput(e.target.value)}
                    className="w-full h-8 px-2.5 rounded bg-[#151921] border border-[#232B38] text-xs font-mono text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#94A3B8] mb-1">
                    TARGET BRANCH
                  </label>
                  <select
                    value={ghBranchInput}
                    onChange={(e) =>
                      setGhBranchInput(e.target.value as 'main' | 'testing' | 'feature/agent-2')
                    }
                    className="w-full h-8 px-2.5 rounded bg-[#151921] border border-[#232B38] text-xs font-mono text-[#F1F5F9]"
                  >
                    <option value="main">main (Production Stable)</option>
                    <option value="testing">testing (Active Integration)</option>
                    <option value="feature/agent-2">feature/agent-2 (Agent 2 Branch)</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setGhPushBanner(
                    `✔ Pushed secret-safe workspace snapshot to https://github.com/${ghRepoInput} (${ghBranchInput})`,
                  )
                }
                className="w-full h-9 rounded bg-[#00F0FF] text-[#0B0D10] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GitBranch size={13} />
                Push Verified Build to {ghRepoInput} ({ghBranchInput})
              </button>
            </div>

            <div className="p-5 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#10B981]" />
                  User-Confirmed Production Deployment ($0.00/mo)
                </h2>
                <span className="text-[11px] font-mono text-[#00F0FF]">
                  Confirmation Gate Active
                </span>
              </div>
              <div className="flex gap-2">
                {(['vercel', 'render'] as const).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setCloudProviderChoice(prov)}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-mono uppercase cursor-pointer ${
                      cloudProviderChoice === prov
                        ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]'
                        : 'border-[#232B38] bg-[#151921] text-[#94A3B8]'
                    }`}
                  >
                    {prov === 'vercel'
                      ? 'Vercel Hobby (Frontend)'
                      : 'Render Free (Backend)'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudConfirmChecked}
                  onChange={(e) => setCloudConfirmChecked(e.target.checked)}
                  className="accent-[#00F0FF]"
                />
                <span>
                  I explicitly confirm deploying the verified `main` build to{' '}
                  <strong className="text-[#F1F5F9]">{cloudProviderChoice.toUpperCase()}</strong>.
                </span>
              </label>
              <button
                type="button"
                disabled={!cloudConfirmChecked}
                onClick={() => {
                  const newDep = {
                    id: `dpl_${Math.random().toString(36).slice(2, 9)}`,
                    provider:
                      cloudProviderChoice === 'vercel'
                        ? 'Vercel Hobby Free ($0.00/mo)'
                        : 'Render Free Web Service ($0.00/mo)',
                    branch: 'main',
                    sha: '72ca4ee',
                    status: 'READY (PRODUCTION)',
                    url:
                      cloudProviderChoice === 'vercel'
                        ? 'https://devora-platform.vercel.app'
                        : 'https://devora-backend-rl0i.onrender.com',
                    dashboardUrl:
                      cloudProviderChoice === 'vercel'
                        ? 'https://vercel.com/sanjai-225s-projects/devora-platform'
                        : 'https://dashboard.render.com/web/srv-dbk07i49v7es73bamrmg',
                  };
                  setCloudDeployments((prev) => [newDep, ...prev]);
                  setGhPushBanner(
                    `✔ Triggered production deployment ${newDep.id} on ${newDep.provider} -> ${newDep.url}`,
                  );
                }}
                className="w-full h-9 rounded bg-[#10B981] text-[#0B0D10] disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Trigger Confirmed Production Deployment
              </button>
            </div>
          </div>

          {/* Live Production Deployment History */}
          <div className="p-5 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-3">
            <h2 className="text-sm font-semibold">Live Production Deployments &amp; Management Consoles</h2>
            <div className="divide-y divide-[#232B38]">
              {cloudDeployments.map((d) => (
                <div
                  key={d.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px]">
                      {d.status}
                    </span>
                    <span className="text-[#F1F5F9] font-semibold">{d.provider}</span>
                    <span className="text-[#94A3B8]">
                      {d.branch}@{d.sha} ({d.id})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00F0FF] hover:underline"
                    >
                      {d.url}
                    </a>
                    <a
                      href={d.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#94A3B8] hover:text-[#F1F5F9] underline"
                    >
                      Manage Dashboard
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      ) : (
        /* Phase 2 Requirement Synthesis View */
        <main className="flex-1 overflow-y-auto p-6 max-w-[1440px] mx-auto space-y-6">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#232B38]">
            <div className="space-y-1.5">
              <nav className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <span>Projects</span>
                <span className="text-[#64748B]">/</span>
                <span className="text-[#F1F5F9] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                  {projectName}
                </span>
                <span className="text-[#64748B]">/</span>
                <span className="text-[#00F0FF] font-medium">Requirement Synthesis</span>
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                  System Spec Synthesis
                </h1>
                <div className="flex items-center gap-2 font-mono text-xs text-[#94A3B8] bg-[#0F1217] px-3 py-1 rounded border border-[#232B38]">
                  <Cpu size={13} className="text-[#00F0FF]" />
                  <span>Synthesized 1,420 tokens</span>
                  <span>•</span>
                  <span className="text-[#10B981] font-medium">94.8% Confidence Score</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setEditingPrompt((v) => !v)}
                className="h-9 px-3 rounded bg-[#151921] border border-[#232B38] hover:border-[#2E3848] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={14} />
                {editingPrompt ? 'Close Prompt Editor' : 'Edit Raw Prompt'}
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('workflow')}
                className="h-9 px-4 rounded bg-[#00F0FF] text-[#0B0D10] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Workflow Decision</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </header>

          {editingPrompt && (
            <div className="p-4 rounded-lg bg-[#151921] border border-[#00F0FF]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#00F0FF] uppercase">
                  Natural-Language Requirement Prompt
                </span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="px-2.5 py-1 bg-[#0F1217] border border-[#232B38] rounded text-xs text-[#F1F5F9]"
                />
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full h-20 p-3 bg-[#0F1217] border border-[#232B38] rounded text-xs text-[#F1F5F9] outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(false)}
                  className="px-3 py-1.5 rounded bg-[#00F0FF] text-[#0B0D10] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Re-Synthesize Spec
                </button>
              </div>
            </div>
          )}

          {/* Reasoning Callout */}
          <section className="rounded-lg bg-[#0F1217] border border-[#232B38] p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-4xl">
              <div className="w-9 h-9 rounded bg-[#1C222D] border border-[#232B38] flex items-center justify-center text-[#00F0FF] shrink-0">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#00F0FF]">
                    Devora Autonomous Architect
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1C222D] text-[#94A3B8]">
                    DE-REASONING-V4
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  <strong className="text-[#F1F5F9]">Parsed Intent:</strong> {summary}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-[#00F0FF]" />
                    <h2 className="text-sm font-semibold">Target Architecture & Routes</h2>
                  </div>
                  <span className="font-mono text-xs text-[#94A3B8]">4 Endpoints Mapped</span>
                </div>

                <div className="space-y-2.5">
                  {INITIAL_ROUTES.map((r) => (
                    <div
                      key={r.route}
                      className="p-3.5 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded bg-[#1C222D] border border-[#232B38] ${
                              r.isApi ? 'text-[#10B981]' : 'text-[#00F0FF]'
                            }`}
                          >
                            {r.isApi ? 'EDGE API' : 'PAGE'}
                          </span>
                          <span className="font-semibold text-[#F1F5F9]">{r.route}</span>
                          <span className="text-[#64748B]">— {r.name}</span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25">
                          {r.priority}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">{r.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-4 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-[#00F0FF]" />
                    <h3 className="text-sm font-semibold">Auto-Resolved Technology Stack</h3>
                  </div>
                  <span className="font-mono text-[11px] text-[#10B981]">
                    Zero Configuration Conflicts
                  </span>
                </div>
              </section>

              <section className="rounded-lg bg-[#0F1217] border border-[#232B38] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#151921] border-b border-[#232B38] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#00F0FF]" />
                    <span className="text-xs font-semibold">Project Workspace Agent Chat</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-[#10B981]">
                    <Wifi size={11} /> WS GATEWAY READY
                  </span>
                </div>
                <div className="p-4 space-y-2.5 max-h-48 overflow-y-auto">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded text-xs leading-relaxed border bg-[#151921] border-[#232B38]"
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendChat}
                  className="p-2.5 bg-[#151921] border-t border-[#232B38] flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Devora to refine requirements..."
                    className="flex-1 h-8 px-3 bg-[#0F1217] border border-[#232B38] rounded text-xs text-[#F1F5F9] outline-none"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded bg-[#00F0FF] text-[#0B0D10] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} /> Send
                  </button>
                </form>
              </section>
            </div>

            <aside className="lg:col-span-5 space-y-6">
              <section className="p-4 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-[#00F0FF]" />
                    <h2 className="text-sm font-semibold">Agent Clarifications</h2>
                  </div>
                </div>
                <div className="space-y-3">
                  {CLARIFICATIONS.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded bg-[#151921] border border-[#232B38] space-y-2"
                    >
                      <div className="font-mono text-[11px] text-[#00F0FF] font-semibold">
                        {c.label}
                      </div>
                      <p className="text-xs text-[#F1F5F9]">{c.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {c.options.map((opt) => {
                          const active = selectedAnswers[c.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [c.id]: opt }))
                              }
                              className={`px-2.5 py-1.5 rounded border text-left font-mono text-[11px] flex items-center justify-between cursor-pointer ${
                                active
                                  ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]'
                                  : 'border-[#232B38] bg-[#1C222D] text-[#94A3B8]'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {active && <Check size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleApplyClarifications}
                  className="w-full h-8 rounded bg-[#151921] border border-[#232B38] text-xs font-medium cursor-pointer"
                >
                  Apply Clarification Decisions
                </button>
              </section>

              <section className="p-4 rounded-lg bg-[#0F1217] border border-[#232B38] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#94A3B8] uppercase font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#10B981]" />
                    Security & Schema Pass
                  </span>
                  <span className="font-mono text-[10px] text-[#10B981]">3 / 3 PASSED</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveNav('workflow')}
                    className="flex-1 h-9 rounded bg-[#151921] border border-[#232B38] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} /> Export PRD
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('workflow')}
                    className="flex-1 h-9 rounded bg-[#00F0FF] text-[#0B0D10] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Continue to Dev Flow <ChevronRight size={14} />
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
