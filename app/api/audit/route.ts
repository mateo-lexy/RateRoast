import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  BENCH,
  CurrencyKey,
  RoleKey,
  formatRate,
  normalizeAuditResponse,
  normalizeHandle,
  roleLabel,
  validateAuditInput,
} from '@/lib/rateroast';

export const runtime = 'nodejs';

const AUDIT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: 'Brutal readiness score from 0 to 100.',
    },
    verdictBadge: {
      type: Type.STRING,
      description:
        'Must be "Verified Pro" if score >= 80, "Needs Surgery" if score is 50-79, or "Instant Pass" if score < 50.',
    },
    verdictHeadline: {
      type: Type.STRING,
      description:
        '1 punchy sentence (max 15 words) summarizing how a skeptical client reacts in 4 seconds.',
    },
    realityCheckTitles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Exactly 3 crisp 2-3 word critique titles.',
    },
    realityCheck: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Strictly 3 short, brutal critiques tailored to the user role, rate, and pitch (max 18 words each).',
    },
    rateAnalysis: {
      type: Type.STRING,
      description:
        '1 sharp sentence (max 25 words) evaluating whether their rate is underpriced, overpriced, or justified.',
    },
    rewrittenPitch: {
      type: Type.STRING,
      description:
        'Crisp, high-converting, zero-fluff pitch rewrite with scope and outcome (max 55 words).',
    },
    extractedSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Exactly 3 short skill tags (1-2 words each) for their Co-Builder card.',
    },
    oneLiner: {
      type: Type.STRING,
      description:
        '1 crisp, outcome-driven sentence (max 18 words) for the directory card.',
    },
  },
  required: [
    'score',
    'verdictBadge',
    'verdictHeadline',
    'realityCheckTitles',
    'realityCheck',
    'rateAnalysis',
    'rewrittenPitch',
    'extractedSkills',
    'oneLiner',
  ],
};

const SYSTEM_INSTRUCTION = `You are a cynical, high-paying tech founder who reviews 50+ freelancer proposals a week. You despise generic buzzwords ("passionate", "hardworking", "high quality", "affordable", "fast learner", "team player", "give me a chance", "anything", "dear sir/madam") and skip pitches without niche ROI or pricing authority.

Return ultra-concise, surgical JSON:
- score: integer 0-100 (<45 for buzzword/underpriced generalists, 50-74 for vague pros, 80+ for sharp ROI pitches).
- verdictBadge: "Verified Pro" (>=80), "Needs Surgery" (50-79), or "Instant Pass" (<50).
- verdictHeadline: 1 punchy sentence, max 15 words.
- realityCheckTitles: 3 titles, 2-3 words each.
- realityCheck: strictly 3 brutal, specific critiques referencing their pitch/rate, max 18 words each.
- rateAnalysis: 1 sharp sentence comparing their rate to market floor, max 25 words.
- rewrittenPitch: zero-fluff high-converting offer rewrite, max 55 words.
- extractedSkills: 3 short tags (1-2 words each).
- oneLiner: 1 crisp outcome line, max 18 words.`;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const handle = normalizeHandle(typeof body.handle === 'string' ? body.handle : '');
  const role = (typeof body.role === 'string' ? body.role : 'ai') as RoleKey;
  const currency = (typeof body.currency === 'string' ? body.currency : 'usd') as CurrencyKey;
  const rate = typeof body.rate === 'number' ? body.rate : Number(body.rate);
  const pitch = typeof body.pitch === 'string' ? body.pitch.trim() : '';

  const validationError = validateAuditInput({ rate, pitch, role, currency });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const marketFloor = formatRate(BENCH[currency][role], currency);
  const quotedRate = formatRate(rate, currency);
  const prompt = [
    `Freelancer Handle: ${handle || '(not provided)'}`,
    `Role: ${roleLabel(role)}`,
    `Quoted Rate: ${quotedRate}`,
    `Market Benchmark Floor for ${roleLabel(role)}: ~${marketFloor}`,
    `Pitch / Bio:\n"""\n${pitch}\n"""`,
  ].join('\n\n');

  const attempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
  ];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts.length; attempt++) {
    const { model, thinkingLevel } = attempts[attempt];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: AUDIT_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        return NextResponse.json(
          { error: 'The auditor returned an empty response. Please try again.' },
          { status: 502 }
        );
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const normalized = normalizeAuditResponse(parsed, {
        handle,
        role,
        currency,
        rate,
        pitch,
      });

      return NextResponse.json(normalized);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('500') ||
        msg.includes('INTERNAL');
      if (isTransient && attempt < attempts.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      break;
    }
  }

  const rawMessage = lastError instanceof Error ? lastError.message : 'Audit request failed.';
  let cleanMessage = rawMessage;
  try {
    const parsedErr = JSON.parse(rawMessage) as { error?: { message?: string } };
    if (parsedErr?.error?.message) {
      cleanMessage = parsedErr.error.message;
    }
  } catch {
    // keep rawMessage
  }
  if (cleanMessage.includes('429') || cleanMessage.includes('RESOURCE_EXHAUSTED')) {
    return NextResponse.json(
      { error: 'Rate limit reached on Gemini API. Wait a moment and retry.' },
      { status: 429 }
    );
  }
  if (
    cleanMessage.includes('403') ||
    cleanMessage.includes('API_KEY_INVALID') ||
    cleanMessage.includes('API key')
  ) {
    return NextResponse.json(
      { error: 'Gemini API key error. Verify GEMINI_API_KEY in Settings > Secrets.' },
      { status: 500 }
    );
  }
  if (cleanMessage.includes('high demand') || cleanMessage.includes('UNAVAILABLE')) {
    return NextResponse.json(
      { error: `Audit service temporarily busy: ${cleanMessage}` },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: `Audit failed: ${cleanMessage}` },
    { status: 502 }
  );
}
