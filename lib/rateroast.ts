export type RoleKey = 'ai' | 'design' | 'copy' | 'dev';
export type CurrencyKey = 'usd' | 'idr';
export type LookingFor = 'Technical Co-Builder' | 'UI/UX Partner' | 'Growth & Sales';

export interface RoleOption {
  k: RoleKey;
  l: string;
}

export const ROLES: RoleOption[] = [
  { k: 'ai', l: 'AI & Frontend Builder' },
  { k: 'design', l: 'UI/UX Designer' },
  { k: 'copy', l: 'Conversion Copywriter' },
  { k: 'dev', l: 'Full-Stack Engineer' },
];

export const LOOK: LookingFor[] = [
  'Technical Co-Builder',
  'UI/UX Partner',
  'Growth & Sales',
];

export const BENCH: Record<CurrencyKey, Record<RoleKey, number>> = {
  usd: { ai: 60, design: 50, copy: 45, dev: 65 },
  idr: { ai: 15_000_000, design: 12_000_000, copy: 8_000_000, dev: 18_000_000 },
};

export interface ContactEntry {
  label: string;
  value: string;
}

export interface DirectoryProfile {
  id: string;
  name: string;
  role: RoleKey;
  rate: number;
  cur: CurrencyKey;
  score: number;
  originalScore: number;
  isDemoPublish: boolean;
  line: string;
  rewrittenPitch: string;
  looking: LookingFor;
  skills: string[];
  contacts: ContactEntry[];
  isSeed: boolean;
  createdAtMs?: number;
}

export interface AuditFormInput {
  handle: string;
  role: RoleKey;
  currency: CurrencyKey;
  rate: number;
  pitch: string;
}

export interface AuditResult {
  score: number;
  verdictBadge: string;
  verdictHeadline: string;
  realityCheck: string[];
  realityCheckTitles: string[];
  rateAnalysis: string;
  rewrittenPitch: string;
  extractedSkills: string[];
  oneLiner: string;
  upgradedScore: number;
}

export const SEED_PROFILES: DirectoryProfile[] = [
  {
    id: 's1',
    name: 'Raka Mahendra',
    role: 'ai',
    rate: 70,
    cur: 'usd',
    score: 94,
    originalScore: 94,
    isDemoPublish: false,
    line: 'Ships Gemini-powered MVPs in three weeks; the last one cut a clinic’s intake time by 61%.',
    rewrittenPitch:
      'I build production Gemini-powered MVPs for founders in 21 days. My last launch cut a medical clinic’s patient intake time by 61%. Fixed-scope sprints from $70/hr.',
    looking: 'UI/UX Partner',
    skills: ['Gemini API', 'React / Next.js', 'Rapid MVPs'],
    contacts: [
      { label: 'Email', value: 'raka@mahendra.dev' },
      { label: 'Telegram', value: '@rakamahendra' },
    ],
    isSeed: true,
  },
  {
    id: 's2',
    name: 'Nadia Putri',
    role: 'design',
    rate: 18_000_000,
    cur: 'idr',
    score: 91,
    originalScore: 91,
    isDemoPublish: false,
    line: 'Redesigned a fintech onboarding flow and lifted activation 34% in six weeks.',
    rewrittenPitch:
      'I redesign SaaS and fintech onboarding flows to stop early user drop-off. My last sprint lifted user activation 34% in six weeks. Research, prototype, and dev-ready Figma specs.',
    looking: 'Technical Co-Builder',
    skills: ['Onboarding UX', 'Design Systems', 'Fintech'],
    contacts: [
      { label: 'Email', value: 'hello@nadiaputri.design' },
      { label: 'WhatsApp', value: '+62 812 5550 0142' },
    ],
    isSeed: true,
  },
  {
    id: 's3',
    name: 'Dimas Aryo',
    role: 'copy',
    rate: 55,
    cur: 'usd',
    score: 88,
    originalScore: 88,
    isDemoPublish: false,
    line: 'Landing-page rewrites that moved a SaaS trial-to-paid rate from 2.1% to 4.6%.',
    rewrittenPitch:
      'I rewrite B2B SaaS landing pages to double trial-to-paid conversion. My last overhaul moved a product from 2.1% to 4.6% in 14 days without extra ad spend.',
    looking: 'Growth & Sales',
    skills: ['SaaS Positioning', 'Landing Pages', 'CRO Copy'],
    contacts: [
      { label: 'Email', value: 'dimas@aryowrites.co' },
      { label: 'Telegram', value: '@dimasaryo' },
    ],
    isSeed: true,
  },
  {
    id: 's4',
    name: 'Sofia Lim',
    role: 'dev',
    rate: 80,
    cur: 'usd',
    score: 86,
    originalScore: 86,
    isDemoPublish: false,
    line: 'Zero-downtime Rails-to-Next.js migrations and 40+ production launches.',
    rewrittenPitch:
      'I execute zero-downtime migrations from legacy Rails monoliths to typed Next.js stacks. 40+ production launches with automated tests and clean CI/CD handover.',
    looking: 'UI/UX Partner',
    skills: ['Next.js', 'Migrations', 'Full-Stack'],
    contacts: [
      { label: 'Email', value: 'sofia@limbuilds.dev' },
      { label: 'LinkedIn', value: 'linkedin.com/in/sofialim' },
    ],
    isSeed: true,
  },
];

export const EXAMPLE_BAD_PITCH = {
  handle: '@budi_webdev',
  role: 'dev' as RoleKey,
  currency: 'usd' as CurrencyKey,
  rate: '8',
  pitch:
    'Hi sir/madam! I am a passionate and hardworking full-stack developer with 3 years experience. I can do anything: website, mobile app, AI, anything you need. Very affordable price and fast delivery, quality guaranteed. Please give me a chance to work with you, I am a fast learner and team player. Contact me now!',
};

export function roleLabel(k: RoleKey): string {
  return (ROLES.find((r) => r.k === k) ?? ROLES[0]).l;
}

export function formatRate(n: number, cur: CurrencyKey): string {
  if (cur === 'usd') {
    return '$' + Number(n).toLocaleString('en-US') + '/hr';
  }
  return 'Rp ' + Number(n).toLocaleString('id-ID') + '/project';
}

export function normalizeHandle(h: string): string {
  const trimmed = h.trim();
  if (!trimmed) return '';
  return !/\s/.test(trimmed) && trimmed[0] !== '@' ? '@' + trimmed : trimmed;
}

export function computeUpgradedScore(score: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return Math.min(96, Math.max(84, clamped + 32));
}

export function computeCardRate(rate: number, cur: CurrencyKey, role: RoleKey): number {
  return Math.max(rate, BENCH[cur][role]);
}

export function deriveVerdictBadge(score: number): string {
  if (score >= 80) return 'Verified Pro';
  if (score >= 50) return 'Needs Surgery';
  return 'Instant Pass';
}

export function validateAuditInput(input: {
  rate: number;
  pitch: string;
  role?: string;
  currency?: string;
}): string | null {
  if (input.role !== undefined && !['ai', 'design', 'copy', 'dev'].includes(input.role)) {
    return 'Select a valid role.';
  }
  if (input.currency !== undefined && !['usd', 'idr'].includes(input.currency)) {
    return 'Select a valid currency.';
  }
  if (!Number.isFinite(input.rate) || input.rate <= 0 || input.rate > 1_000_000_000) {
    return 'Enter your rate as a number above 0.';
  }
  if (input.pitch.trim().length < 30) {
    return 'Paste at least a couple of sentences from your pitch or bio.';
  }
  if (input.pitch.trim().length > 4000) {
    return 'Keep your pitch under 4,000 characters.';
  }
  return null;
}

export function validateCollabInput(input: {
  senderHandle: string;
  message: string;
}): string | null {
  if (input.senderHandle.trim().length < 2) {
    return 'Add your handle or email so they can reply.';
  }
  if (input.message.trim().length < 10) {
    return 'Write at least a short sentence in your collab message.';
  }
  return null;
}

export function normalizeAuditResponse(
  raw: Record<string, unknown>,
  input: AuditFormInput
): AuditResult {
  const rawScore = typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : 50;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const badgeRaw = typeof raw.verdictBadge === 'string' ? raw.verdictBadge.trim() : '';
  const verdictBadge = badgeRaw || deriveVerdictBadge(score);

  const verdictHeadline =
    typeof raw.verdictHeadline === 'string' && raw.verdictHeadline.trim()
      ? raw.verdictHeadline.trim()
      : score >= 80
        ? 'This pitch commands attention and justifies your rate.'
        : score >= 50
          ? `There is real ${roleLabel(input.role).toLowerCase()} skill here, buried under safe phrasing.`
          : 'A skeptical client would close this tab in four seconds.';

  const rawReality = Array.isArray(raw.realityCheck)
    ? raw.realityCheck.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const defaultTitles = ['Generic Positioning', 'Pricing Mismatch', 'Missing ROI Proof'];
  const rawTitles = Array.isArray(raw.realityCheckTitles)
    ? raw.realityCheckTitles.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const realityCheck: string[] = [];
  const realityCheckTitles: string[] = [];
  for (let i = 0; i < 3; i++) {
    realityCheck.push(
      rawReality[i] ||
        'Your pitch lacks specific buyer outcomes, clear scope boundaries, and proof.'
    );
    realityCheckTitles.push(rawTitles[i] || defaultTitles[i]);
  }

  const rateAnalysis =
    typeof raw.rateAnalysis === 'string' && raw.rateAnalysis.trim()
      ? raw.rateAnalysis.trim()
      : `${formatRate(input.rate, input.currency)} needs sharper outcome-based framing against the ${formatRate(BENCH[input.currency][input.role], input.currency)} market benchmark.`;

  const rewrittenPitch =
    typeof raw.rewrittenPitch === 'string' && raw.rewrittenPitch.trim()
      ? raw.rewrittenPitch.trim()
      : `I help teams ship measurable ${roleLabel(input.role).toLowerCase()} outcomes in fixed 2-week sprints starting at ${formatRate(computeCardRate(input.rate, input.currency, input.role), input.currency)}.`;

  const rawSkills = Array.isArray(raw.extractedSkills)
    ? raw.extractedSkills
        .map((s) => String(s).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const extractedSkills =
    rawSkills.length > 0 ? rawSkills : [roleLabel(input.role).split(' ')[0], 'Sprint Delivery', 'ROI Focus'];

  const oneLinerRaw =
    typeof raw.oneLiner === 'string' && raw.oneLiner.trim()
      ? raw.oneLiner.trim()
      : rewrittenPitch.split(/(?<=[.!?])\s+/)[0] || rewrittenPitch;
  const oneLiner = oneLinerRaw.slice(0, 360);

  return {
    score,
    verdictBadge,
    verdictHeadline,
    realityCheck,
    realityCheckTitles,
    rateAnalysis,
    rewrittenPitch,
    extractedSkills,
    oneLiner,
    upgradedScore: computeUpgradedScore(score),
  };
}

export function sanitizeProfileId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
  return cleaned.length >= 2 ? cleaned : `u_${Date.now()}`;
}

export function sanitizeProfileForFirestore(input: {
  id: string;
  name: string;
  role: RoleKey;
  rate: number;
  cur: CurrencyKey;
  score: number;
  originalScore: number;
  isDemoPublish: boolean;
  line: string;
  rewrittenPitch: string;
  looking: LookingFor;
  skills: string[];
  contacts: ContactEntry[];
  isSeed: boolean;
}) {
  const id = sanitizeProfileId(input.id);
  const name = input.name.trim().slice(0, 80) || '@builder';
  const line = input.line.trim().slice(0, 360) || 'Verified RateRoast co-builder.';
  const rewrittenPitch =
    input.rewrittenPitch.trim().slice(0, 2000) || line;
  const skills = input.skills
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 3);
  const contacts = input.contacts
    .map((c) => ({
      label: c.label.trim().slice(0, 40) || 'Handle',
      value: c.value.trim().slice(0, 120) || name,
    }))
    .filter((c) => c.label && c.value)
    .slice(0, 4);

  if (contacts.length === 0) {
    contacts.push({ label: 'Handle', value: name.slice(0, 120) });
  }

  return {
    id,
    name,
    role: input.role,
    rate: Math.max(1, Math.min(1_000_000_000, Number(input.rate))),
    cur: input.cur,
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    originalScore: Math.max(0, Math.min(100, Math.round(input.originalScore))),
    isDemoPublish: Boolean(input.isDemoPublish),
    line,
    rewrittenPitch,
    looking: input.looking,
    skills,
    contacts,
    isSeed: Boolean(input.isSeed),
  };
}

export function sanitizeCollabForFirestore(input: {
  id: string;
  targetProfileId: string;
  targetName: string;
  senderHandle: string;
  message: string;
}) {
  return {
    id: sanitizeProfileId(input.id),
    targetProfileId: sanitizeProfileId(input.targetProfileId),
    targetName: input.targetName.trim().slice(0, 80) || 'Builder',
    senderHandle: input.senderHandle.trim().slice(0, 100),
    message: input.message.trim().slice(0, 1200),
  };
}
