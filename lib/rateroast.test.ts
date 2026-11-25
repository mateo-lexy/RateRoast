import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCH,
  computeCardRate,
  computeUpgradedScore,
  deriveVerdictBadge,
  formatRate,
  normalizeAuditResponse,
  normalizeHandle,
  sanitizeCollabForFirestore,
  sanitizeProfileForFirestore,
  validateAuditInput,
  validateCollabInput,
} from './rateroast';

test('formatRate formats USD/hr and IDR/project accurately', () => {
  assert.equal(formatRate(70, 'usd'), '$70/hr');
  assert.equal(formatRate(18000000, 'idr'), 'Rp 18.000.000/project');
});

test('normalizeHandle prefixes @ for handle-like strings without spaces', () => {
  assert.equal(normalizeHandle('budi_webdev'), '@budi_webdev');
  assert.equal(normalizeHandle('@budi_webdev'), '@budi_webdev');
  assert.equal(normalizeHandle('Raka Mahendra'), 'Raka Mahendra');
  assert.equal(normalizeHandle('   '), '');
});

test('validateAuditInput catches invalid rate and short pitch', () => {
  assert.match(validateAuditInput({ rate: 0, pitch: 'A'.repeat(40) }) ?? '', /above 0/i);
  assert.match(validateAuditInput({ rate: 50, pitch: 'too short' }) ?? '', /couple of sentences/i);
  assert.equal(
    validateAuditInput({
      rate: 50,
      pitch: 'I ship Next.js and AI products that cut manual ops by 40% in 14 days.',
      role: 'ai',
      currency: 'usd',
    }),
    null
  );
});

test('validateCollabInput enforces sender handle and message length', () => {
  assert.match(validateCollabInput({ senderHandle: '', message: 'Let us collaborate!' }) ?? '', /handle/i);
  assert.match(validateCollabInput({ senderHandle: '@alex', message: 'hi' }) ?? '', /short sentence/i);
  assert.equal(
    validateCollabInput({ senderHandle: '@alex', message: 'Would love to pair on a 2-week sprint.' }),
    null
  );
});

test('computeCardRate raises underpriced rates to role market floor', () => {
  assert.equal(computeCardRate(8, 'usd', 'dev'), BENCH.usd.dev);
  assert.equal(computeCardRate(120, 'usd', 'dev'), 120);
  assert.equal(computeUpgradedScore(35), 84);
  assert.equal(deriveVerdictBadge(82), 'Verified Pro');
  assert.equal(deriveVerdictBadge(65), 'Needs Surgery');
  assert.equal(deriveVerdictBadge(30), 'Instant Pass');
});

test('normalizeAuditResponse enforces score bounds, 3 critiques, and 3 skills', () => {
  const result = normalizeAuditResponse(
    {
      score: 140,
      verdictBadge: '',
      realityCheck: ['Weak hook', 'Too cheap'],
      rateAnalysis: 'Way below floor.',
      rewrittenPitch: 'I ship typed Next.js apps in 14 days.',
      extractedSkills: ['Next.js', 'TypeScript', 'PostgreSQL', 'ExtraTag'],
    },
    {
      handle: '@dev',
      role: 'dev',
      currency: 'usd',
      rate: 10,
      pitch: 'I am passionate and hardworking.',
    }
  );
  assert.equal(result.score, 100);
  assert.equal(result.verdictBadge, 'Verified Pro');
  assert.equal(result.realityCheck.length, 3);
  assert.equal(result.realityCheckTitles.length, 3);
  assert.equal(result.extractedSkills.length, 3);
});

test('Firestore sanitizers enforce blueprint length and ID constraints', () => {
  const profile = sanitizeProfileForFirestore({
    id: 'bad id!@# 123',
    name: 'A'.repeat(120),
    role: 'ai',
    rate: 80,
    cur: 'usd',
    score: 90,
    originalScore: 42,
    isDemoPublish: true,
    line: 'L'.repeat(500),
    rewrittenPitch: 'Pitch body',
    looking: 'UI/UX Partner',
    skills: ['React', 'Gemini', 'Node', 'Overflow'],
    contacts: [],
    isSeed: false,
  });
  assert.match(profile.id, /^[a-zA-Z0-9_\-]+$/);
  assert.equal(profile.name.length, 80);
  assert.equal(profile.line.length, 360);
  assert.equal(profile.skills.length, 3);
  assert.equal(profile.contacts.length, 1);

  const collab = sanitizeCollabForFirestore({
    id: 'req_1',
    targetProfileId: 's1',
    targetName: 'Raka',
    senderHandle: '@tester',
    message: 'Hey Raka, let us build together this week.',
  });
  assert.equal(collab.targetProfileId, 's1');
  assert.equal(collab.senderHandle, '@tester');
});
