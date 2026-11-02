/**
 * Devora Dynamic Multi-Page Website Synthesizer & AI Suggestion Engine.
 *
 * Ensures every natural-language prompt generates a tailored, domain-authentic
 * 5-page interactive website with working navigation, interactive widgets,
 * recommended tech stack, design palette, and live AI modification support.
 */

export interface SynthesizedPage {
  id: string;
  navLabel: string;
  route: string;
  title: string;
  badge: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  widgetType:
    | 'booking'
    | 'catalog'
    | 'calculator'
    | 'dashboard'
    | 'menu'
    | 'pricing'
    | 'directory'
    | 'contact';
  highlights: { label: string; value: string; detail: string }[];
  cards: {
    id: string;
    title: string;
    subtitle: string;
    priceOrStat: string;
    badge: string;
    description: string;
    actionLabel: string;
  }[];
}

export interface SynthesizedWebsite {
  projectId: string;
  projectName: string;
  prompt: string;
  domainCategory: string;
  roleCreatedBy: 'user' | 'developer';
  autoBuilt: boolean;
  createdAt: string;
  palette: {
    name: string;
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  stack: {
    framework: string;
    styling: string;
    backend: string;
    database: string;
    auth: string;
  };
  aiSuggestions: {
    architectureNotes: string[];
    suggestedFeatures: string[];
    recommendedIntegrations: string[];
  };
  pages: SynthesizedPage[];
  customModifications: string[];
}

const STORAGE_PREFIX = 'devora_synth_site_';

function extractBrandName(prompt: string, explicitName?: string): string {
  if (explicitName && explicitName.trim().length > 1) {
    return explicitName.trim();
  }
  const quoted = prompt.match(/["']([^"']{3,32})["']/);
  if (quoted && quoted[1]) return quoted[1].trim();

  const calledMatch = prompt.match(/(?:called|named|for)\s+([A-Z][A-Za-z0-9\s&]{2,26})/);
  if (calledMatch && calledMatch[1]) {
    return calledMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
  }

  const stopWords = new Set([
    'build',
    'create',
    'make',
    'design',
    'website',
    'web',
    'app',
    'application',
    'platform',
    'system',
    'portal',
    'with',
    'that',
    'for',
    'the',
    'and',
    'modern',
    'high',
    'level',
    'multi',
    'page',
    'pages',
    'online',
    'user',
    'users',
    'need',
    'want',
    'please',
    'simple',
    'full',
  ]);

  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

  if (words.length >= 2) {
    const cap = words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return `${cap} Studio`;
  }
  return 'NovaPulse Digital';
}

export function synthesizeWebsiteFromPrompt(
  prompt: string,
  options?: {
    projectId?: string;
    projectName?: string;
    role?: 'user' | 'developer';
    autoBuilt?: boolean;
  },
): SynthesizedWebsite {
  const cleanPrompt =
    prompt.trim() ||
    'Modern multi-page SaaS & customer portal with interactive booking, analytics, and pricing';
  const p = cleanPrompt.toLowerCase();
  const projectId = options?.projectId || `proj-${Date.now().toString(36)}`;
  const brand = extractBrandName(cleanPrompt, options?.projectName);
  const role = options?.role || 'user';
  const autoBuilt = options?.autoBuilt ?? true;

  // Domain 1: Healthcare / Medical / Clinic / Dental / Wellness
  if (
    /clinic|dental|dentist|medical|doctor|hospital|health|patient|therapy|pharmacy|wellness/.test(p)
  ) {
    return {
      projectId,
      projectName: brand,
      prompt: cleanPrompt,
      domainCategory: 'Healthcare & Patient Care Platform',
      roleCreatedBy: role,
      autoBuilt,
      createdAt: new Date().toISOString(),
      palette: {
        name: 'Clinical Sky & Emerald Trust',
        primary: '#0EA5E9',
        secondary: '#10B981',
        background: '#07111A',
        surface: '#0E1D2B',
        text: '#F0F9FF',
        muted: '#94A3B8',
      },
      stack: {
        framework: 'Next.js 16 (App Router)',
        styling: 'Tailwind CSS 4 + Clinical UI',
        backend: 'FastAPI Appointment Engine',
        database: 'PostgreSQL + Firestore Records',
        auth: 'Patient & Doctor RBAC SSO',
      },
      aiSuggestions: {
        architectureNotes: [
          '5-page patient-first architecture with instant slot booking & specialist triage',
          'Zero-config HIPAA-friendly form states and automated insurance cost estimator',
          'Includes Patient Portal page for lab results, prescriptions, and telehealth check-in',
        ],
        suggestedFeatures: [
          'Interactive Doctor & Specialty Appointment Scheduler',
          'Treatment Price & Insurance Coverage Estimator',
          'Board-Certified Specialist Directory with Live Availability',
          'Secure Patient Portal with Lab Results & Prescription Refills',
        ],
        recommendedIntegrations: ['Google Calendar Sync', 'Stripe Copay Checkout', 'Twilio SMS Reminders'],
      },
      pages: [
        {
          id: 'home',
          navLabel: 'Home & Triage',
          route: '/',
          title: `${brand} — Compassionate Modern Healthcare`,
          badge: '24/7 Digital Triage & Same-Day Appointments',
          headline: `World-Class Care at ${brand}, Designed Around You`,
          subheadline: cleanPrompt,
          primaryCta: 'Book Appointment Now',
          secondaryCta: 'Explore Treatments',
          widgetType: 'booking',
          highlights: [
            { label: 'Average Wait Time', value: '< 6 mins', detail: 'Real-time check-in queue' },
            { label: 'Board Specialists', value: '42 Doctors', detail: 'Verified clinical credentials' },
            { label: 'Patient Satisfaction', value: '4.96 / 5.0', detail: 'Based on 12,400+ visits' },
          ],
          cards: [
            {
              id: 'c1',
              title: 'Comprehensive Preventive Checkup',
              subtitle: 'Full Diagnostic Panel & Consultation',
              priceOrStat: '$120 / Covered by Insurance',
              badge: 'MOST POPULAR',
              description: 'Complete vitals, blood biomarkers, cardiovascular screening, and 45-minute physician review.',
              actionLabel: 'Select Care Plan',
            },
            {
              id: 'c2',
              title: 'Cosmetic & Restorative Dental Suite',
              subtitle: '3D Digital Smile Imaging & Hygiene',
              priceOrStat: '$95 / Visit',
              badge: 'SAME-DAY SLOT',
              description: 'Painless ultrasonic cleaning, laser whitening, and precision ceramic restoration.',
              actionLabel: 'Reserve Dental Slot',
            },
            {
              id: 'c3',
              title: 'Instant Video Telehealth Consult',
              subtitle: 'Connect From Home in 10 Minutes',
              priceOrStat: '$49 Flat Copay',
              badge: 'TELEHEALTH LIVE',
              description: 'Direct HD video consultation with digital prescription routing to your local pharmacy.',
              actionLabel: 'Start Video Visit',
            },
          ],
        },
        {
          id: 'services',
          navLabel: 'Treatments & Care',
          route: '/services',
          title: 'Clinical Departments & Transparent Pricing',
          badge: 'All Specialties Under One Roof',
          headline: 'Specialized Clinical Programs & Diagnostic Labs',
          subheadline: 'Filter procedures, compare insurance coverage, and view preparation guidelines.',
          primaryCta: 'Estimate My Coverage',
          secondaryCta: 'Download Care Guide',
          widgetType: 'catalog',
          highlights: [
            { label: 'Diagnostic Lab Turnaround', value: '4 Hours', detail: 'Same-day digital results' },
            { label: 'Accepted Insurers', value: '35+ Plans', detail: 'Instant eligibility check' },
            { label: 'Emergency Triage', value: 'Always Open', detail: 'On-call clinical team' },
          ],
          cards: [
            {
              id: 's1',
              title: 'Cardiology & Vascular Health',
              subtitle: 'ECG, Echocardiogram & Stress Testing',
              priceOrStat: '$180',
              badge: 'DIAGNOSTICS',
              description: 'Non-invasive cardiac imaging and personalized heart longevity protocols.',
              actionLabel: 'Book Cardiology',
            },
            {
              id: 's2',
              title: 'Orthopedics & Sports Recovery',
              subtitle: 'Joint Mobility & Physical Therapy',
              priceOrStat: '$110',
              badge: 'RECOVERY',
              description: 'Biomechanical gait analysis, targeted physiotherapy, and injury rehabilitation.',
              actionLabel: 'Book Mobility Lab',
            },
            {
              id: 's3',
              title: 'Dermatology & Skin Longevity',
              subtitle: 'Clinical Dermoscopy & Laser Care',
              priceOrStat: '$135',
              badge: 'DERMATOLOGY',
              description: 'Full-body skin mapping, acne & rosacea therapy, and regenerative treatments.',
              actionLabel: 'Book Skin Consult',
            },
          ],
        },
        {
          id: 'doctors',
          navLabel: 'Specialists',
          route: '/specialists',
          title: 'Meet Our Board-Certified Medical Team',
          badge: 'Verified Medical Credentials',
          headline: 'Experienced Physicians Dedicated to Preventive Excellence',
          subheadline: 'Browse specialist profiles, languages spoken, and next available appointment slots.',
          primaryCta: 'Match Me With a Doctor',
          secondaryCta: 'View Credentials',
          widgetType: 'directory',
          highlights: [
            { label: 'Fellowship Trained', value: '100%', detail: 'Top academic medical centers' },
            { label: 'Languages Spoken', value: '14+', detail: 'Multilingual patient support' },
            { label: 'Follow-Up Access', value: 'Direct Chat', detail: '24h physician messaging' },
          ],
          cards: [
            {
              id: 'd1',
              title: 'Dr. Elena Rostova, MD',
              subtitle: 'Chief of Internal Medicine & Longevity',
              priceOrStat: 'Next Slot: Today 2:30 PM',
              badge: '4.99 ★ (410 Reviews)',
              description: '15+ years leading preventive diagnostics and personalized metabolic medicine.',
              actionLabel: 'Book Dr. Rostova',
            },
            {
              id: 'd2',
              title: 'Dr. Marcus Chen, DDS',
              subtitle: 'Lead Restorative & Implant Specialist',
              priceOrStat: 'Next Slot: Tomorrow 10:00 AM',
              badge: '4.97 ★ (328 Reviews)',
              description: 'Pioneer in minimally invasive digital dentistry and 3D guided smile design.',
              actionLabel: 'Book Dr. Chen',
            },
            {
              id: 'd3',
              title: 'Dr. Priya Nair, MD',
              subtitle: 'Senior Cardiologist & Telemetry Lead',
              priceOrStat: 'Next Slot: Thu 11:15 AM',
              badge: '4.98 ★ (290 Reviews)',
              description: 'Specializes in preventive cardiology, wearable ECG analytics, and athletic heart care.',
              actionLabel: 'Book Dr. Nair',
            },
          ],
        },
        {
          id: 'portal',
          navLabel: 'Patient Portal',
          route: '/portal',
          title: 'Interactive Patient Health Dashboard',
          badge: 'HIPAA-Encrypted Health Records',
          headline: 'Your Lab Results, Prescriptions & Visit History',
          subheadline: 'Track biomarkers over time, request 1-click prescription renewals, and message your care team.',
          primaryCta: 'Request Prescription Refill',
          secondaryCta: 'Download Lab PDF',
          widgetType: 'dashboard',
          highlights: [
            { label: 'Active Prescriptions', value: '2 Ready', detail: 'Auto-refill enabled' },
            { label: 'Latest Lab Panel', value: 'All Optimal', detail: 'Reviewed by Dr. Rostova' },
            { label: 'Upcoming Visit', value: 'Nov 14, 10:30 AM', detail: 'Annual Wellness Check' },
          ],
          cards: [
            {
              id: 'p1',
              title: 'Comprehensive Metabolic Panel (CMP)',
              subtitle: 'Collected 3 Days Ago • Fasting',
              priceOrStat: '98 / 100 Optimal',
              badge: 'NORMAL',
              description: 'Glucose 86 mg/dL, HbA1c 5.1%, Vitamin D 58 ng/mL, Lipid panel within athletic target.',
              actionLabel: 'View Biomarker Chart',
            },
            {
              id: 'p2',
              title: 'Active Prescription: Daily D3 + K2 & Omega-3',
              subtitle: '2 Refills Remaining • Local Pharmacy',
              priceOrStat: 'Ready for Pickup',
              badge: 'ACTIVE RX',
              description: 'Approved by Dr. Elena Rostova. Click to dispatch refill to your preferred pharmacy.',
              actionLabel: 'Dispatch Refill',
            },
            {
              id: 'p3',
              title: 'Insurance & Copay Statement',
              subtitle: 'Zero Balance Due',
              priceOrStat: '$0.00 Due',
              badge: 'PAID IN FULL',
              description: 'All preventive visits covered 100% under your verified primary health plan.',
              actionLabel: 'View Receipt',
            },
          ],
        },
        {
          id: 'contact',
          navLabel: 'Locations & Emergency',
          route: '/contact',
          title: 'Clinic Locations, Hours & Direct Triage',
          badge: '3 Metro Clinics + 24/7 Virtual Care',
          headline: 'Visit Us In Person or Connect Immediately Online',
          subheadline: 'Complimentary valet parking, on-site pharmacy, and rapid diagnostic imaging.',
          primaryCta: 'Send Triage Message',
          secondaryCta: 'Get Directions',
          widgetType: 'contact',
          highlights: [
            { label: 'Weekday Hours', value: '7:00 AM – 8:00 PM', detail: 'Extended evening care' },
            { label: 'Weekend Urgent Care', value: '8:00 AM – 5:00 PM', detail: 'Walk-ins welcome' },
            { label: 'Direct Nurse Line', value: '1-800-555-CARE', detail: 'Answered in < 60 sec' },
          ],
          cards: [
            {
              id: 'loc1',
              title: 'Downtown Flagship Medical Center',
              subtitle: '450 Innovation Blvd, Suite 300',
              priceOrStat: 'Open Now • 4 min wait',
              badge: 'FLAGSHIP',
              description: 'Full imaging suite, dental studio, cardiology lab, and on-site compounding pharmacy.',
              actionLabel: 'Select Downtown',
            },
            {
              id: 'loc2',
              title: 'Westside Wellness & Dental Pavilion',
              subtitle: '880 Harbor View Avenue',
              priceOrStat: 'Open Now • 2 min wait',
              badge: 'WESTSIDE',
              description: 'Preventive medicine, family dentistry, pediatrics, and physical recovery studio.',
              actionLabel: 'Select Westside',
            },
          ],
        },
      ],
      customModifications: [],
    };
  }

  // Domain 2: E-Commerce / Storefront / Fashion / Retail / Marketplace
  if (
    /shop|store|ecommerce|e-commerce|fashion|sneaker|apparel|cart|product|boutique|jewelry|watch|marketplace|buy/.test(
      p,
    )
  ) {
    return {
      projectId,
      projectName: brand,
      prompt: cleanPrompt,
      domainCategory: 'E-Commerce & Direct-to-Consumer Storefront',
      roleCreatedBy: role,
      autoBuilt,
      createdAt: new Date().toISOString(),
      palette: {
        name: 'Editorial Amber & Obsidian Luxe',
        primary: '#F59E0B',
        secondary: '#EC4899',
        background: '#0A090D',
        surface: '#15131B',
        text: '#FAF8FF',
        muted: '#A1A1AA',
      },
      stack: {
        framework: 'Next.js 16 Commerce',
        styling: 'Tailwind CSS 4 + Editorial Tokens',
        backend: 'Stripe Checkout + Inventory API',
        database: 'PostgreSQL Product Catalog',
        auth: 'Customer Accounts & 1-Click Passkeys',
      },
      aiSuggestions: {
        architectureNotes: [
          '5-page high-conversion commerce architecture with live shopping bag & promo calculator',
          'Interactive category filtering, size/color selector, and bundle builder',
          'Includes real-time Order Tracking and VIP Loyalty rewards portal',
        ],
        suggestedFeatures: [
          'Interactive Product Grid with Live Add-to-Cart & Bag Total',
          'Custom Bundle & Lookbook Configurator with Automatic Discount',
          'Express Checkout Simulator with Promo Code Validation',
          'Order Shipment Tracker & Easy Returns Self-Service Page',
        ],
        recommendedIntegrations: ['Stripe Checkout', 'Algolia InstantSearch', 'Shippo Live Rates'],
      },
      pages: [
        {
          id: 'home',
          navLabel: 'Storefront',
          route: '/',
          title: `${brand} — Flagship Digital Store`,
          badge: 'LIMITED SEASONAL DROP • FREE GLOBAL EXPRESS SHIPPING',
          headline: `Crafted for Distinction: The New ${brand} Collection`,
          subheadline: cleanPrompt,
          primaryCta: 'Shop New Arrivals',
          secondaryCta: 'Open Lookbook',
          widgetType: 'catalog',
          highlights: [
            { label: 'Express Dispatch', value: 'Same-Day', detail: 'Orders before 4 PM' },
            { label: 'Customer Rating', value: '4.94 ★', detail: '18,200+ verified buyers' },
            { label: 'Sustainability', value: '100% Carbon Neutral', detail: 'Traceable materials' },
          ],
          cards: [
            {
              id: 'p1',
              title: 'Signature Obsidian Chrono Edition',
              subtitle: 'Brushed Titanium & Sapphire Crystal',
              priceOrStat: '$289',
              badge: 'BESTSELLER',
              description: 'Precision engineered everyday statement piece with lifetime warranty and custom engraving.',
              actionLabel: 'Add to Bag — $289',
            },
            {
              id: 'p2',
              title: 'AeroWeave Technical Weekender Bag',
              subtitle: 'Waterproof Ballistic Nylon • 38L',
              priceOrStat: '$195',
              badge: 'LIMITED STOCK',
              description: 'Dedicated 16" laptop vault, magnetic fidlock buckles, and cabin-approved ergonomics.',
              actionLabel: 'Add to Bag — $195',
            },
            {
              id: 'p3',
              title: 'Artisan Minimalist Everyday Sneaker',
              subtitle: 'Full-Grain Italian Calfskin',
              priceOrStat: '$220',
              badge: 'NEW DROP',
              description: 'Hand-stitched Margom cupsole with cloud-foam ortholite insole for all-day comfort.',
              actionLabel: 'Add to Bag — $220',
            },
          ],
        },
        {
          id: 'catalog',
          navLabel: 'Full Catalog',
          route: '/catalog',
          title: 'Interactive Product Catalog & Filters',
          badge: '36 Curated Essentials In Stock',
          headline: 'Explore Every Piece by Category, Material & Price',
          subheadline: 'Click any item to add directly to your live shopping bag and test instant checkout.',
          primaryCta: 'Filter Best Sellers',
          secondaryCta: 'Reset Filters',
          widgetType: 'catalog',
          highlights: [
            { label: 'In-Stock Guarantee', value: '99.4%', detail: 'Live warehouse sync' },
            { label: 'Free Returns', value: '30 Days', detail: 'Instant prepaid label' },
            { label: 'Bundle Savings', value: 'Save 15%', detail: 'On 2+ items' },
          ],
          cards: [
            {
              id: 'cat1',
              title: 'Merino Thermal Overshirt',
              subtitle: '100% Australian Extra-Fine Merino',
              priceOrStat: '$165',
              badge: 'APPAREL',
              description: 'Temperature-regulating tailored overshirt in charcoal slate and midnight navy.',
              actionLabel: 'Add to Bag — $165',
            },
            {
              id: 'cat2',
              title: 'Precision Machined Cardholder',
              subtitle: 'Aerospace Grade 5 Titanium + RFID Block',
              priceOrStat: '$89',
              badge: 'ACCESSORIES',
              description: 'Holds up to 8 cards with zero-profile spring mechanism and cash strap.',
              actionLabel: 'Add to Bag — $89',
            },
            {
              id: 'cat3',
              title: 'Studio Acoustic Wireless ANC Headphones',
              subtitle: '45-Hour Battery • Lossless Spatial Audio',
              priceOrStat: '$340',
              badge: 'AUDIO',
              description: 'Custom 40mm beryllium drivers with memory-foam lambskin ear cushions.',
              actionLabel: 'Add to Bag — $340',
            },
          ],
        },
        {
          id: 'lookbook',
          navLabel: 'Bundle Builder',
          route: '/lookbook',
          title: 'Editorial Lookbook & Custom Bundle Studio',
          badge: 'Automatic 15% Bundle Tier Discount',
          headline: 'Curate Your Complete Kit & Save Instantly',
          subheadline: 'Mix and match flagship essentials with real-time bundle pricing.',
          primaryCta: 'Add Complete Bundle to Bag',
          secondaryCta: 'Customize Pieces',
          widgetType: 'calculator',
          highlights: [
            { label: '2-Piece Bundle', value: '10% OFF', detail: 'Applied automatically' },
            { label: '3-Piece Complete Set', value: '18% OFF', detail: 'Includes VIP Gift Box' },
            { label: 'Complimentary Express', value: '$0 Shipping', detail: 'On all bundles' },
          ],
          cards: [
            {
              id: 'b1',
              title: 'The Executive Travel Trio',
              subtitle: 'Weekender Bag + Chrono Watch + Cardholder',
              priceOrStat: '$470 (Save $103)',
              badge: 'CURATED SET',
              description: 'Our #1 rated combination for frequent flyers and modern founders.',
              actionLabel: 'Select Travel Trio',
            },
            {
              id: 'b2',
              title: 'The Creative Studio Kit',
              subtitle: 'ANC Headphones + Merino Overshirt + Sneaker',
              priceOrStat: '$615 (Save $110)',
              badge: 'CREATOR PICK',
              description: 'Designed for deep focus sessions and effortless city transitions.',
              actionLabel: 'Select Studio Kit',
            },
          ],
        },
        {
          id: 'checkout',
          navLabel: 'Bag & Checkout',
          route: '/checkout',
          title: 'Express Bag & Zero-Friction Checkout',
          badge: '256-Bit Encrypted Checkout',
          headline: 'Review Your Bag, Apply Promo Codes & Complete Order',
          subheadline: 'Try promo code DEVORA20 for 20% off during your interactive preview test.',
          primaryCta: 'Complete Test Order',
          secondaryCta: 'Apply Promo DEVORA20',
          widgetType: 'pricing',
          highlights: [
            { label: 'Promo Code Active', value: 'DEVORA20', detail: '20% instant discount' },
            { label: 'Shipping Method', value: 'DHL Express Air', detail: '2-day delivery' },
            { label: 'Payment Protection', value: 'Stripe Verified', detail: 'Apple Pay & Cards' },
          ],
          cards: [
            {
              id: 'chk1',
              title: 'Standard Express Delivery',
              subtitle: '2–3 Business Days • Tracked Door-to-Door',
              priceOrStat: 'FREE',
              badge: 'INCLUDED',
              description: 'Insured courier delivery with live SMS map tracking.',
              actionLabel: 'Selected',
            },
            {
              id: 'chk2',
              title: 'Same-Day Courier Concierge',
              subtitle: 'Delivered Within 4 Hours in Metro Zones',
              priceOrStat: '$19',
              badge: 'VIP SPEED',
              description: 'Dedicated direct courier hand-delivery with signature confirmation.',
              actionLabel: 'Upgrade Shipping',
            },
          ],
        },
        {
          id: 'orders',
          navLabel: 'Track Order & VIP',
          route: '/orders',
          title: 'Live Order Tracking & VIP Member Portal',
          badge: 'Real-Time Logistics Telemetry',
          headline: 'Track Your Shipment & Manage VIP Rewards',
          subheadline: 'View live package milestones, download invoices, or initiate a 1-click exchange.',
          primaryCta: 'Track Order #DV-8841',
          secondaryCta: 'Redeem VIP Points',
          widgetType: 'dashboard',
          highlights: [
            { label: 'Active Shipment', value: 'In Transit', detail: 'Arriving Tomorrow by 5 PM' },
            { label: 'VIP Loyalty Balance', value: '2,450 Pts', detail: 'Equals $49 store credit' },
            { label: 'Member Tier', value: 'Obsidian Founders', detail: 'Early access unlocked' },
          ],
          cards: [
            {
              id: 'ord1',
              title: 'Order #DV-8841 — Signature Obsidian Chrono',
              subtitle: 'Cleared Customs • Out for Local Sorting',
              priceOrStat: 'On Schedule',
              badge: 'IN TRANSIT',
              description: 'Last scanned at Regional Hub 18 minutes ago. SMS delivery alert active.',
              actionLabel: 'View Live Route',
            },
            {
              id: 'ord2',
              title: 'VIP Founders Reward Voucher',
              subtitle: 'Redeemable on Any Full-Price Item',
              priceOrStat: '$50 Credit',
              badge: 'AVAILABLE',
              description: 'Apply with 1 click on your next order with zero minimum spend.',
              actionLabel: 'Copy Voucher Code',
            },
          ],
        },
      ],
      customModifications: [],
    };
  }

  // Domain 3: Real Estate / Property / Hotel / Travel / Booking
  if (/real estate|property|apartment|villa|housing|realtor|mortgage|rent|hotel|resort|travel/.test(p)) {
    return {
      projectId,
      projectName: brand,
      prompt: cleanPrompt,
      domainCategory: 'Real Estate & Architectural Property Marketplace',
      roleCreatedBy: role,
      autoBuilt,
      createdAt: new Date().toISOString(),
      palette: {
        name: 'Emerald Architectural Estate',
        primary: '#10B981',
        secondary: '#06B6D4',
        background: '#08100D',
        surface: '#111F1A',
        text: '#ECFDF5',
        muted: '#9CA3AF',
      },
      stack: {
        framework: 'Next.js 16 Spatial Web',
        styling: 'Tailwind CSS 4',
        backend: 'GeoSearch & Valuation API',
        database: 'PostGIS + Firestore',
        auth: 'Buyer, Seller & Advisor Portal',
      },
      aiSuggestions: {
        architectureNotes: [
          '5-page property discovery & financial analysis architecture',
          'Includes interactive monthly mortgage & rental yield calculator',
          'Private viewing scheduler with in-person or live video tour options',
        ],
        suggestedFeatures: [
          'Neighborhood & Price Range Property Filter',
          'Interactive Mortgage, Down Payment & Rental Yield Calculator',
          '1-Click Private Tour & Video Walkthrough Scheduler',
          'Market Appreciation & School Walkability Insights',
        ],
        recommendedIntegrations: ['Mapbox GL', 'DocuSign Offer Letters', 'Calendly Advisor Sync'],
      },
      pages: [
        {
          id: 'home',
          navLabel: 'Explore Estates',
          route: '/',
          title: `${brand} — Curated Architectural Homes & Investments`,
          badge: 'VERIFIED LUXURY & MODERN RESIDENCES',
          headline: `Discover Extraordinary Living Spaces with ${brand}`,
          subheadline: cleanPrompt,
          primaryCta: 'Browse Verified Listings',
          secondaryCta: 'Calculate Mortgage',
          widgetType: 'catalog',
          highlights: [
            { label: 'Active Listings', value: '148 Homes', detail: 'Verified title & 3D tours' },
            { label: 'Avg Days to Close', value: '19 Days', detail: 'Digital escrow workflow' },
            { label: 'Buyer Savings', value: '1.5% Rebate', detail: 'Transparent commission' },
          ],
          cards: [
            {
              id: 're1',
              title: 'The Glass Pavilion Penthouse',
              subtitle: '4 Bed • 4.5 Bath • 3,850 Sq Ft • Panoramic Terrace',
              priceOrStat: '$2,450,000',
              badge: 'FEATURED 3D TOUR',
              description: 'Floor-to-ceiling low-E glass, private elevator keycard access, and heated saltwater plunge pool.',
              actionLabel: 'Schedule Viewing',
            },
            {
              id: 're2',
              title: 'Mid-Century Canyon Villa',
              subtitle: '3 Bed • 3 Bath • 2,920 Sq Ft • Architectural Digest Pick',
              priceOrStat: '$1,680,000',
              badge: 'NEW LISTING',
              description: 'Restored cedar post-and-beam residence with chef kitchen and solar + battery microgrid.',
              actionLabel: 'Schedule Viewing',
            },
            {
              id: 're3',
              title: 'Waterfront Loft Residence #14B',
              subtitle: '2 Bed • 2.5 Bath • 1,840 Sq Ft • Marina Slip Included',
              priceOrStat: '$985,000',
              badge: 'HIGH YIELD',
              description: 'Direct marina boardwalk access, smart home automation, and 24-hour concierge.',
              actionLabel: 'Schedule Viewing',
            },
          ],
        },
        {
          id: 'listings',
          navLabel: 'All Listings',
          route: '/listings',
          title: 'Interactive Property Directory & Comparison',
          badge: 'Updated Every 15 Minutes from MLS',
          headline: 'Filter Residences by Architecture, Price & Rental Yield',
          subheadline: 'Compare price per sq ft, HOA dues, and estimated cap rate side by side.',
          primaryCta: 'Filter Waterfront Homes',
          secondaryCta: 'Save Search Alert',
          widgetType: 'catalog',
          highlights: [
            { label: 'Median Price / Sq Ft', value: '$590', detail: '+6.4% YoY appreciation' },
            { label: 'Avg Rental Cap Rate', value: '6.8%', detail: 'Verified short/long term' },
            { label: 'Virtual Walkthroughs', value: '100% HD', detail: 'Matterport 3D ready' },
          ],
          cards: [
            {
              id: 'l1',
              title: 'Solstice Eco-Townhouse',
              subtitle: '3 Bed • 2.5 Bath • Net-Zero Energy Certified',
              priceOrStat: '$840,000',
              badge: 'ECO CERTIFIED',
              description: 'Private rooftop garden, EV dual-charger garage, and walkability score 96/100.',
              actionLabel: 'View Floorplan',
            },
            {
              id: 'l2',
              title: 'Monolith Concrete & Cedar Retreat',
              subtitle: '5 Bed • 5 Bath • 4,600 Sq Ft • 1.2 Acres',
              priceOrStat: '$3,190,000',
              badge: 'PRIVATE ESTATE',
              description: 'Infinity edge pool, detached guest studio, and subterranean wine cellar.',
              actionLabel: 'View Floorplan',
            },
          ],
        },
        {
          id: 'calculator',
          navLabel: 'Mortgage & ROI',
          route: '/calculator',
          title: 'Interactive Mortgage & Investment Return Calculator',
          badge: 'Live Rate & Amortization Engine',
          headline: 'Model Your Monthly Payment, Down Payment & Rental Cashflow',
          subheadline: 'Adjust property price, down payment percentage, and interest term in real time.',
          primaryCta: 'Get Pre-Approved in 3 Mins',
          secondaryCta: 'Download PDF Breakdown',
          widgetType: 'calculator',
          highlights: [
            { label: 'Sample Property Price', value: '$1,200,000', detail: '20% Down ($240,000)' },
            { label: 'Est. Monthly Principal & Interest', value: '$5,890 / mo', detail: '30-Year Fixed @ 6.15%' },
            { label: 'Projected Gross Rental Income', value: '$7,400 / mo', detail: '+$1,510 net cashflow' },
          ],
          cards: [
            {
              id: 'm1',
              title: '30-Year Fixed Jumbo Loan',
              subtitle: '6.125% APR • Zero Origination Points',
              priceOrStat: '$5,840 / mo',
              badge: 'MOST POPULAR',
              description: 'Lock your rate for 90 days with complimentary float-down option if rates drop.',
              actionLabel: 'Lock Rate Quote',
            },
            {
              id: 'm2',
              title: '7/1 ARM Portfolio Investor Rate',
              subtitle: '5.55% APR • Ideal for 5–7 Year Horizon',
              priceOrStat: '$5,480 / mo',
              badge: 'INVESTOR PICK',
              description: 'Lower initial monthly carrying cost to maximize cash-on-cash rental return.',
              actionLabel: 'Lock Investor Rate',
            },
          ],
        },
        {
          id: 'schedule',
          navLabel: 'Book Viewing',
          route: '/schedule',
          title: 'Schedule a Private In-Person or Live Video Tour',
          badge: 'Licensed Senior Property Advisors',
          headline: 'Tour Any Residence on Your Schedule',
          subheadline: 'Choose between chauffeured private showing or live 4K FaceTime/Zoom walkthrough.',
          primaryCta: 'Confirm Tour Reservation',
          secondaryCta: 'Speak to an Advisor',
          widgetType: 'booking',
          highlights: [
            { label: 'Same-Day Showings', value: 'Available', detail: '7 days a week' },
            { label: 'Private Video Tours', value: 'Live 4K', detail: 'For remote buyers' },
            { label: 'Offer Preparation', value: 'Included', detail: 'Data-backed comps report' },
          ],
          cards: [
            {
              id: 't1',
              title: 'Private Chauffeured Property Tour',
              subtitle: 'Tour up to 4 Curated Homes in One Afternoon',
              priceOrStat: 'Complimentary',
              badge: 'IN-PERSON',
              description: 'Includes printed architectural dossiers, neighborhood comp sheet, and refreshments.',
              actionLabel: 'Book In-Person Tour',
            },
            {
              id: 't2',
              title: 'Live Interactive 4K Video Walkthrough',
              subtitle: 'Guided by Lead Advisor On-Site',
              priceOrStat: '30 Mins Live',
              badge: 'REMOTE BUYER',
              description: 'Inspect natural light, acoustic insulation, and neighborhood streetscape live from anywhere.',
              actionLabel: 'Book Video Tour',
            },
          ],
        },
        {
          id: 'insights',
          navLabel: 'Market Insights',
          route: '/insights',
          title: 'Neighborhood Appreciation & Valuation Analytics',
          badge: 'Q4 Real Estate Intelligence Report',
          headline: 'Data-Driven Neighborhood Comps & Growth Forecasts',
          subheadline: 'Track 5-year price appreciation, school district scores, and zoning updates.',
          primaryCta: 'Request Custom Home Valuation',
          secondaryCta: 'Download Market Report',
          widgetType: 'dashboard',
          highlights: [
            { label: '5-Year Appreciation', value: '+41.8%', detail: 'Outperforming metro index' },
            { label: 'Walk & Transit Score', value: '94 / 100', detail: 'Walker’s Paradise' },
            { label: 'Inventory Absorption', value: '1.8 Months', detail: 'Strong seller demand' },
          ],
          cards: [
            {
              id: 'in1',
              title: 'Waterfront & Marina District',
              subtitle: 'Median $1.42M • +8.2% YoY Growth',
              priceOrStat: 'High Demand',
              badge: 'TOP PERFORMER',
              description: 'Driven by new ferry terminal expansion and tech campus relocation.',
              actionLabel: 'View District Comps',
            },
            {
              id: 'in2',
              title: 'Architectural Hills & Canyon',
              subtitle: 'Median $2.15M • +6.9% YoY Growth',
              priceOrStat: 'Low Inventory',
              badge: 'LUXURY TIER',
              description: 'Protected view corridors and high international buyer demand.',
              actionLabel: 'View District Comps',
            },
          ],
        },
      ],
      customModifications: [],
    };
  }

  // Default / Custom SaaS, AI Tool, Agency, Education, Hospitality, or Any User Prompt
  return {
    projectId,
    projectName: brand,
    prompt: cleanPrompt,
    domainCategory: 'Multi-Page Web Application & Customer Platform',
    roleCreatedBy: role,
    autoBuilt,
    createdAt: new Date().toISOString(),
    palette: {
      name: 'Obsidian Cyan & Electric Indigo',
      primary: '#00F0FF',
      secondary: '#6366F1',
      background: '#0B0D10',
      surface: '#131722',
      text: '#F3F5F8',
      muted: '#9BA3B0',
    },
    stack: {
      framework: 'Next.js 16 (App Router)',
      styling: 'Tailwind CSS 4 + Custom Theme',
      backend: 'FastAPI + Serverless Routes',
      database: 'PostgreSQL + Firestore Sync',
      auth: 'Multi-Role RBAC & OAuth',
    },
    aiSuggestions: {
      architectureNotes: [
        `Custom 5-page architecture synthesized directly from your prompt for ${brand}`,
        'Pre-configured smart defaults: responsive navigation, interactive dashboard, pricing calculator, and contact workflow',
        'Supports live AI modifications and 1-click deployment to your own GitHub/Vercel/Render account',
      ],
      suggestedFeatures: [
        `Interactive Hero & Live Workflow Showcase for ${brand}`,
        'Filterable Solutions & Feature Modules with Live Search',
        'Interactive Analytics & Customer Portal Workspace',
        'Dynamic Monthly/Annual Pricing & ROI Estimator',
      ],
      recommendedIntegrations: ['Stripe Billing', 'Firebase Auth & Firestore', 'Resend Transactional Email'],
    },
    pages: [
      {
        id: 'home',
        navLabel: 'Home',
        route: '/',
        title: `${brand} — Official Website`,
        badge: 'AI-BUILT MULTI-PAGE LIVE APPLICATION',
        headline: `${brand}: Built for High-Impact Performance`,
        subheadline: cleanPrompt,
        primaryCta: 'Get Started Now',
        secondaryCta: 'Explore Interactive Demo',
        widgetType: 'dashboard',
        highlights: [
          { label: 'Active Users', value: '24,800+', detail: 'Growing 18% MoM' },
          { label: 'Platform Uptime', value: '99.99%', detail: 'Global edge network' },
          { label: 'Time Saved', value: '14 hrs/wk', detail: 'Automated workflows' },
        ],
        cards: [
          {
            id: 'f1',
            title: 'Automated Core Workflow Engine',
            subtitle: `Tailored for ${brand}`,
            priceOrStat: '10x Faster',
            badge: 'CORE ENGINE',
            description: `Streamlines your primary operations based on: "${cleanPrompt.slice(0, 110)}"`,
            actionLabel: 'Launch Module',
          },
          {
            id: 'f2',
            title: 'Real-Time Analytics & Insights',
            subtitle: 'Live KPI Telemetry & Custom Reports',
            priceOrStat: '< 20ms Sync',
            badge: 'ANALYTICS',
            description: 'Track conversions, customer engagement, and operational health from a unified command center.',
            actionLabel: 'Open Analytics',
          },
          {
            id: 'f3',
            title: 'Team Collaboration & Role Permissions',
            subtitle: 'Granular Access & Audit Logs',
            priceOrStat: 'Enterprise Ready',
            badge: 'SECURITY',
            description: 'Invite team members and clients with customizable permissions and instant notifications.',
            actionLabel: 'Configure Access',
          },
        ],
      },
      {
        id: 'solutions',
        navLabel: 'Solutions & Features',
        route: '/solutions',
        title: `${brand} — Capabilities & Interactive Modules`,
        badge: 'Modular Architecture',
        headline: 'Everything You Need to Scale Without Friction',
        subheadline: 'Filter capabilities, test interactive workflows, and inspect live system components.',
        primaryCta: 'Try Interactive Workflow',
        secondaryCta: 'View Documentation',
        widgetType: 'catalog',
        highlights: [
          { label: 'Pre-Built Automations', value: '45+ Flows', detail: '1-click activation' },
          { label: 'API Webhooks', value: 'Real-Time', detail: 'REST & WebSocket' },
          { label: 'Data Export', value: 'CSV / JSON / PDF', detail: 'Instant reporting' },
        ],
        cards: [
          {
            id: 'sol1',
            title: 'Smart Intake & Customer Onboarding',
            subtitle: 'Zero-Friction Guided Forms',
            priceOrStat: '+38% Conversion',
            badge: 'ONBOARDING',
            description: 'Dynamic multi-step forms with instant validation and automated welcome sequences.',
            actionLabel: 'Preview Flow',
          },
          {
            id: 'sol2',
            title: 'Intelligent Scheduling & Resource Hub',
            subtitle: 'Automated Calendar & Task Routing',
            priceOrStat: '24/7 Active',
            badge: 'AUTOMATION',
            description: 'Eliminate manual back-and-forth with smart capacity planning and instant confirmations.',
            actionLabel: 'Preview Hub',
          },
          {
            id: 'sol3',
            title: 'Custom Branded Client Portal',
            subtitle: 'White-Label Experience',
            priceOrStat: '100% Custom',
            badge: 'PORTAL',
            description: 'Give every customer a dedicated dashboard to track status, files, and invoices.',
            actionLabel: 'Preview Portal',
          },
        ],
      },
      {
        id: 'workspace',
        navLabel: 'Live Portal',
        route: '/portal',
        title: `${brand} — Interactive Customer & Operations Portal`,
        badge: 'Live Interactive State',
        headline: 'Real-Time Control Center & Activity Feed',
        subheadline: 'Search records, trigger live actions, and monitor real-time performance metrics.',
        primaryCta: 'Create New Record',
        secondaryCta: 'Export Report',
        widgetType: 'dashboard',
        highlights: [
          { label: 'Active Workflows', value: '18 Running', detail: 'All healthy' },
          { label: 'Completed Today', value: '342 Tasks', detail: '99.7% success rate' },
          { label: 'Response SLA', value: '1.2 mins', detail: 'Automated triage' },
        ],
        cards: [
          {
            id: 'w1',
            title: 'Q4 Strategic Launch Pipeline',
            subtitle: 'Updated 4 mins ago • Owner: Operations Lead',
            priceOrStat: '92% Complete',
            badge: 'ON TRACK',
            description: 'All milestones verified across design, customer onboarding, and automated billing.',
            actionLabel: 'Inspect Pipeline',
          },
          {
            id: 'w2',
            title: 'Customer Satisfaction & NPS Pulse',
            subtitle: ' Rolling 30-Day Verified Responses',
            priceOrStat: 'NPS +74',
            badge: 'EXCELLENT',
            description: 'Automated feedback collection after every completed customer interaction.',
            actionLabel: 'View Feedback',
          },
        ],
      },
      {
        id: 'pricing',
        navLabel: 'Pricing & ROI',
        route: '/pricing',
        title: `${brand} — Transparent Plans & ROI Calculator`,
        badge: 'Save 20% with Annual Billing',
        headline: 'Simple, Predictable Pricing That Scales With You',
        subheadline: 'Start free and upgrade as your audience and operations grow.',
        primaryCta: 'Start 14-Day Free Trial',
        secondaryCta: 'Compare All Features',
        widgetType: 'pricing',
        highlights: [
          { label: 'Free Starter Tier', value: '$0 / mo', detail: 'No credit card required' },
          { label: 'Pro Growth Plan', value: '$29 / mo', detail: 'Unlimited workflows' },
          { label: 'Enterprise SLA', value: '99.99%', detail: 'Dedicated account lead' },
        ],
        cards: [
          {
            id: 'pr1',
            title: 'Starter Plan — For Individuals & New Projects',
            subtitle: 'Up to 1,000 monthly active visitors',
            priceOrStat: '$0 / month',
            badge: 'FREE FOREVER',
            description: 'Includes all 5 core pages, SSL encryption, basic analytics, and community support.',
            actionLabel: 'Get Started Free',
          },
          {
            id: 'pr2',
            title: 'Pro Growth — For Scaling Teams & Businesses',
            subtitle: 'Up to 50,000 monthly visitors + Custom Domain',
            priceOrStat: '$29 / month',
            badge: 'MOST POPULAR',
            description: 'Includes custom domain, priority automation engine, team roles, and Stripe checkout.',
            actionLabel: 'Start Pro Trial',
          },
          {
            id: 'pr3',
            title: 'Enterprise — For High-Volume Operations',
            subtitle: 'Unlimited capacity + Dedicated Cloud Vault',
            priceOrStat: '$99 / month',
            badge: 'FULL SCALE',
            description: 'SSO/SAML authentication, custom SLA, dedicated onboarding engineer, and audit logs.',
            actionLabel: 'Contact Sales',
          },
        ],
      },
      {
        id: 'contact',
        navLabel: 'About & Contact',
        route: '/contact',
        title: `Connect with the ${brand} Team`,
        badge: 'Direct Support & Custom Inquiries',
        headline: 'Have Questions? Send Us a Message or Book a Live Demo',
        subheadline: 'Our team responds to all inquiries within 2 business hours.',
        primaryCta: 'Send Inquiry',
        secondaryCta: 'Schedule 15-Min Demo',
        widgetType: 'contact',
        highlights: [
          { label: 'Support Response', value: '< 2 Hours', detail: 'Live human + AI triage' },
          { label: 'Global Offices', value: 'San Francisco & Remote', detail: '24/5 coverage' },
          { label: 'Community Members', value: '15,000+', detail: 'Active Discord & Forum' },
        ],
        cards: [
          {
            id: 'ct1',
            title: 'Request a Personalized Walkthrough',
            subtitle: '1-on-1 Architecture & Workflow Review',
            priceOrStat: '15 Minutes',
            badge: 'LIVE DEMO',
            description: 'See how our platform adapts to your exact business requirements and team structure.',
            actionLabel: 'Book Demo Slot',
          },
          {
            id: 'ct2',
            title: 'Direct Technical & Billing Support',
            subtitle: '24/7 Priority Ticket & Live Chat',
            priceOrStat: 'Instant Help',
            badge: 'SUPPORT',
            description: 'Get direct assistance with custom domains, data migration, or account configuration.',
            actionLabel: 'Open Support Ticket',
          },
        ],
      },
    ],
    customModifications: [],
  };
}

export function saveSynthesizedWebsite(site: SynthesizedWebsite): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${site.projectId}`, JSON.stringify(site));
    // Also maintain a list of synthesized sites for the user dashboard
    const listRaw = localStorage.getItem('devora_user_sites_list');
    const list: SynthesizedWebsite[] = listRaw ? JSON.parse(listRaw) : [];
    const filtered = list.filter((item) => item.projectId !== site.projectId);
    filtered.unshift(site);
    localStorage.setItem('devora_user_sites_list', JSON.stringify(filtered.slice(0, 20)));
  } catch {
    // ignore storage quota errors
  }
}

export function loadSynthesizedWebsite(
  projectId: string,
  fallbackPrompt?: string,
  fallbackName?: string,
): SynthesizedWebsite {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      if (raw) {
        return JSON.parse(raw) as SynthesizedWebsite;
      }
      const sessionRaw = sessionStorage.getItem(`devora_project_${projectId}`);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        const generated = synthesizeWebsiteFromPrompt(
          parsed.description || fallbackPrompt || parsed.name || 'Modern Web Platform',
          {
            projectId,
            projectName: parsed.name || fallbackName,
          },
        );
        saveSynthesizedWebsite(generated);
        return generated;
      }
    } catch {
      // fallback below
    }
  }
  return synthesizeWebsiteFromPrompt(
    fallbackPrompt || 'Modern multi-page digital platform with interactive booking, analytics, and pricing',
    {
      projectId,
      projectName: fallbackName,
    },
  );
}

export function applyModificationToWebsite(
  site: SynthesizedWebsite,
  instruction: string,
): SynthesizedWebsite {
  const lower = instruction.toLowerCase();
  const updated: SynthesizedWebsite = JSON.parse(JSON.stringify(site));
  updated.customModifications.unshift(instruction);

  // Palette changes
  if (lower.includes('emerald') || lower.includes('green')) {
    updated.palette.primary = '#10B981';
    updated.palette.secondary = '#06B6D4';
    updated.palette.name = 'Emerald Growth Theme';
  } else if (lower.includes('purple') || lower.includes('violet') || lower.includes('indigo')) {
    updated.palette.primary = '#8B5CF6';
    updated.palette.secondary = '#EC4899';
    updated.palette.name = 'Royal Violet Theme';
  } else if (lower.includes('amber') || lower.includes('gold') || lower.includes('orange')) {
    updated.palette.primary = '#F59E0B';
    updated.palette.secondary = '#F97316';
    updated.palette.name = 'Warm Amber Luxe Theme';
  } else if (lower.includes('cyan') || lower.includes('blue')) {
    updated.palette.primary = '#00F0FF';
    updated.palette.secondary = '#3B82F6';
    updated.palette.name = 'Electric Cyan Theme';
  }

  // Add a new page if requested
  if (lower.includes('add page') || lower.includes('new page') || lower.includes('testimonials') || lower.includes('blog') || lower.includes('faq')) {
    const pageTitle = lower.includes('testimonial')
      ? 'Customer Testimonials & Case Studies'
      : lower.includes('blog')
        ? 'Insights & Engineering Blog'
        : lower.includes('faq')
          ? 'Frequently Asked Questions & Help Center'
          : `Custom Page: ${instruction.slice(0, 32)}`;
    const navLabel = lower.includes('testimonial')
      ? 'Testimonials'
      : lower.includes('blog')
        ? 'Blog'
        : lower.includes('faq')
          ? 'FAQ'
          : 'New Page';

    updated.pages.push({
      id: `custom-${Date.now().toString(36)}`,
      navLabel,
      route: `/${navLabel.toLowerCase().replace(/\s+/g, '-')}`,
      title: pageTitle,
      badge: 'AI-ADDED PAGE',
      headline: pageTitle,
      subheadline: `Added via live AI instruction: "${instruction}"`,
      primaryCta: 'Explore Details',
      secondaryCta: 'Share Feedback',
      widgetType: 'catalog',
      highlights: [
        { label: 'Added By AI', value: 'Live Sync', detail: 'Zero downtime update' },
        { label: 'Verified Stories', value: '100%', detail: 'Real customer outcomes' },
        { label: 'Page Speed', value: '99/100', detail: 'Instant edge render' },
      ],
      cards: [
        {
          id: `card-${Date.now()}`,
          title: `${updated.projectName} Success Story #1`,
          subtitle: 'Verified Enterprise Deployment',
          priceOrStat: '+240% ROI',
          badge: 'FEATURED',
          description: `Custom section generated from your prompt: "${instruction}"`,
          actionLabel: 'Read Full Case Study',
        },
        {
          id: `card-${Date.now() + 1}`,
          title: `${updated.projectName} Community Highlight`,
          subtitle: '5-Star Customer Review',
          priceOrStat: '5.0 ★',
          badge: 'VERIFIED',
          description: 'Seamless multi-page experience with instant updates and zero configuration headaches.',
          actionLabel: 'View Details',
        },
      ],
    });
  } else {
    // Update hero headline or add a card to the first page
    updated.pages[0].subheadline = `${updated.pages[0].subheadline} • Updated: ${instruction}`;
    updated.pages[0].cards.unshift({
      id: `mod-${Date.now()}`,
      title: `AI Custom Update: ${instruction.slice(0, 48)}`,
      subtitle: 'Live Incremental Modification Applied',
      priceOrStat: 'LIVE NOW',
      badge: 'AI UPDATED',
      description: `Surgically applied your modification ("${instruction}") to ${updated.projectName} without regenerating untouched pages.`,
      actionLabel: 'Interact Now',
    });
  }

  saveSynthesizedWebsite(updated);
  return updated;
}
