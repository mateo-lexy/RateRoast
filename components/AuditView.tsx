'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { BadgeCheck, Check, Copy, Flame } from 'lucide-react';
import {
  AuditFormInput,
  AuditResult,
  BENCH,
  CurrencyKey,
  LOOK,
  LookingFor,
  ROLES,
  RoleKey,
  computeCardRate,
  formatRate,
  roleLabel,
} from '@/lib/rateroast';

const LOADING_STAGES = [
  'Scanning for buzzwords...',
  'Judging your hourly rate...',
  'Preparing emotional damage...',
  'Rewriting with zero fluff...',
];

interface AuditViewProps {
  handle: string;
  onHandleChange: (val: string) => void;
  role: RoleKey;
  onRoleChange: (val: RoleKey) => void;
  currency: CurrencyKey;
  onCurrencyChange: (val: CurrencyKey) => void;
  rate: string;
  onRateChange: (val: string) => void;
  pitch: string;
  onPitchChange: (val: string) => void;
  error: string;
  isLoading: boolean;
  loaderExiting: boolean;
  loaderStep: number;
  audit: { form: AuditFormInput; data: AuditResult } | null;
  lookingFor: LookingFor;
  onLookingForChange: (val: LookingFor) => void;
  isPublishing: boolean;
  onFillExample: () => void;
  onRoast: () => void;
  onPublish: () => void;
  onCopyText: (text: string) => Promise<boolean>;
  onToast: (msg: string) => void;
  reducedMotion: boolean;
  handleInputRef: React.RefObject<HTMLInputElement | null>;
  rateInputRef: React.RefObject<HTMLInputElement | null>;
  pitchInputRef: React.RefObject<HTMLTextAreaElement | null>;
  loaderRef: React.RefObject<HTMLDivElement | null>;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  cascadeElements: (els: Element[]) => void;
}

export function AuditView({
  handle,
  onHandleChange,
  role,
  onRoleChange,
  currency,
  onCurrencyChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
  error,
  isLoading,
  loaderExiting,
  loaderStep,
  audit,
  lookingFor,
  onLookingForChange,
  isPublishing,
  onFillExample,
  onRoast,
  onPublish,
  onCopyText,
  onToast,
  reducedMotion,
  handleInputRef,
  rateInputRef,
  pitchInputRef,
  loaderRef,
  resultsRef,
  cascadeElements,
}: AuditViewProps) {
  const scoreRef = useRef<HTMLSpanElement | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const resetRaf = requestAnimationFrame(() => setLoadingStageIdx(0));
    const interval = setInterval(() => {
      setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 1100);
    return () => {
      cancelAnimationFrame(resetRaf);
      clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!audit || !resultsRef.current) return;
    const scoreEl = scoreRef.current;
    const targetScore = audit.data.score;

    let tween: gsap.core.Tween | null = null;
    if (scoreEl) {
      if (!reducedMotion) {
        const counter = { v: 0 };
        tween = gsap.to(counter, {
          v: targetScore,
          duration: 1.2,
          ease: 'power3.out',
          onUpdate: () => {
            if (scoreEl) scoreEl.textContent = String(Math.round(counter.v));
          },
        });
      } else {
        scoreEl.textContent = String(targetScore);
      }
    }

    const staged = Array.from(resultsRef.current.querySelectorAll('.stg'));
    cascadeElements(staged);

    return () => {
      if (tween) tween.kill();
    };
  }, [audit, reducedMotion, cascadeElements, resultsRef]);

  const handleCopyPitch = async () => {
    if (!audit) return;
    const ok = await onCopyText(audit.data.rewrittenPitch);
    setCopiedPitch(ok);
    onToast(ok ? 'Pitch copied.' : 'Copy failed. Select and copy manually.');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedPitch(false), 1800);
  };

  const statusClass = audit
    ? audit.data.score < 50
      ? 'no'
      : audit.data.score >= 80
        ? 'ok'
        : 'mid'
    : 'mid';

  const cardRate = audit
    ? computeCardRate(audit.form.rate, audit.form.currency, audit.form.role)
    : 0;
  const raisedToFloor = audit ? cardRate > audit.form.rate : false;
  const isVerifiedOrganic = audit ? audit.data.score >= 75 : false;

  return (
    <>
      <div className="pt-10 pb-8 md:pt-16 md:pb-10">
        <h1
          id="h-audit"
          className="hd"
          style={{ fontSize: 'clamp(2.2rem,7vw,4rem)', lineHeight: 1.02, maxWidth: '15ch' }}
        >
          Stop pitching like an amateur. Get brutally audited.
        </h1>
        <p className="mute mt-5 text-base md:text-lg" style={{ maxWidth: '56ch' }}>
          Our auditor reads your pitch the way a skeptical, high-paying client does: fast,
          impatient, and looking for a reason to say no. You get a score, the flaws, and a
          rewrite that earns the reply.
        </p>
      </div>

      <div className="glass p-5 md:p-8">
        <div className="grid gap-5">
          <div>
            <label className="lbl" htmlFor="handle">
              Name or handle
            </label>
            <input
              ref={handleInputRef}
              id="handle"
              className="field"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
            />
          </div>

          <div>
            <span className="lbl" id="l-role">
              Your role
            </span>
            <div id="roles" className="flex flex-wrap gap-2" role="group" aria-labelledby="l-role">
              {ROLES.map((r) => (
                <button
                  key={r.k}
                  type="button"
                  className="chip"
                  data-role={r.k}
                  aria-pressed={role === r.k}
                  onClick={() => onRoleChange(r.k)}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="lbl" htmlFor="rate">
              Your rate
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={rateInputRef}
                id="rate"
                className="field"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder={currency === 'usd' ? '25' : '1500000'}
                style={{ flex: 1 }}
                value={rate}
                onChange={(e) => onRateChange(e.target.value)}
              />
              <div
                className="seg"
                id="cur"
                role="group"
                aria-label="Currency and unit"
                style={{ width: 'auto' }}
              >
                <button
                  type="button"
                  data-cur="usd"
                  aria-pressed={currency === 'usd'}
                  onClick={() => onCurrencyChange('usd')}
                >
                  USD/hr
                </button>
                <button
                  type="button"
                  data-cur="idr"
                  aria-pressed={currency === 'idr'}
                  onClick={() => onCurrencyChange('idr')}
                >
                  IDR/project
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="lbl" htmlFor="pitch">
              Pitch or bio
            </label>
            <textarea
              ref={pitchInputRef}
              id="pitch"
              data-lenis-prevent
              className="field"
              placeholder="Paste your service description, profile bio, or cold outreach message."
              value={pitch}
              onChange={(e) => onPitchChange(e.target.value)}
            />
          </div>

          <p
            id="err"
            role="alert"
            className="text-sm font-semibold"
            style={{ color: 'var(--coral-ink)' }}
            hidden={!error}
          >
            {error}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button
              className="btn btn-glass"
              id="fill"
              type="button"
              disabled={isLoading}
              onClick={onFillExample}
            >
              Fill Bad Pitch Example
            </button>
            <button
              className="btn btn-dark"
              id="roast"
              type="button"
              disabled={isLoading}
              onClick={onRoast}
            >
              {isLoading ? LOADING_STAGES[loadingStageIdx] : 'Roast My Profile'}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={loaderRef}
        id="loader"
        className={`glass p-6 md:p-8 mt-6${loaderExiting ? ' out' : ''}${isLoading ? ' stg' : ''}`}
        hidden={!isLoading && !loaderExiting}
        aria-live="polite"
      >
        <div className="grid gap-4">
          {[
            'Analyzing positioning…',
            'Benchmarking rate against market…',
            'Writing brutal verdict…',
          ].map((label, idx) => {
            const stateClass =
              idx < loaderStep ? 'step done' : idx === loaderStep ? 'step on' : 'step';
            return (
              <div key={label} className={stateClass}>
                <i>{idx < loaderStep ? <Check className="ic" aria-hidden="true" /> : null}</i>
                {label}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={resultsRef} id="results" className="mt-6 grid gap-5" hidden={!audit}>
        {audit ? (
          <>
            <div
              className="glass stg p-6 md:p-8 grid md:grid-cols-[auto,1fr] gap-6 items-center"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              <div className="hd flex items-baseline gap-1">
                <span className="score" id="scoreNum" ref={scoreRef}>
                  {audit.data.score}
                </span>
                <span className="mute text-2xl">/100</span>
              </div>
              <div>
                <span className={`status ${statusClass}`}>{audit.data.verdictBadge}</span>
                <p className="hd text-xl md:text-2xl mt-3" style={{ lineHeight: 1.25 }}>
                  {audit.data.verdictHeadline}
                </p>
                <p className="mute text-sm mt-2">{audit.data.rateAnalysis}</p>
                <p className="mute text-xs mt-2">
                  The rewrite below lifts this to {audit.data.upgradedScore}/100 (market floor{' '}
                  {formatRate(BENCH[audit.form.currency][audit.form.role], audit.form.currency)}).
                </p>
              </div>
            </div>

            <h2 className="hd text-2xl mt-4 stg" style={{ '--i': 1 } as React.CSSProperties}>
              Brutal reality check
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {audit.data.realityCheck.map((detail, i) => (
                <div
                  key={i}
                  className="roast stg"
                  style={{ '--i': i + 2 } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2" style={{ color: 'var(--coral-ink)' }}>
                    <Flame className="ic" aria-hidden="true" />
                    <h3 className="hd text-base">
                      {audit.data.realityCheckTitles[i] || `Critique #${i + 1}`}
                    </h3>
                  </div>
                  <p className="text-sm mt-3" style={{ lineHeight: 1.55 }}>
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="glass stg p-6 md:p-8"
              style={{ background: 'var(--pill)', '--i': 5 } as React.CSSProperties}
            >
              <h2 className="hd text-2xl">High-converting rewrite</h2>
              <p
                className="mt-4 text-base md:text-[17px]"
                style={{ lineHeight: 1.65, maxWidth: '68ch' }}
              >
                {audit.data.rewrittenPitch}
              </p>
              <p className="mute text-xs mt-3">
                Swap the example numbers for your real results before you send it.
              </p>
              <button
                type="button"
                className="btn btn-dark mt-5"
                id="copyPitch"
                onClick={handleCopyPitch}
              >
                {copiedPitch ? (
                  <>
                    <Check className="ic" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="ic" aria-hidden="true" /> Copy Pitch
                  </>
                )}
              </button>
            </div>

            <h2 className="hd text-2xl mt-4 stg" style={{ '--i': 6 } as React.CSSProperties}>
              Your Co-Builder card
            </h2>

            <div
              className="pass stg p-6 md:p-8 w-full"
              id="pass"
              style={{ maxWidth: 440, '--i': 7 } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="hd text-2xl truncate">
                    {audit.form.handle || '@yourhandle'}
                  </div>
                  <div className="mute text-sm">{roleLabel(audit.form.role)}</div>
                </div>
                <span className={`badge ${isVerifiedOrganic ? 'ok' : 'mid'}`}>
                  <BadgeCheck className="ic" aria-hidden="true" />
                  {isVerifiedOrganic ? 'Verified Pro' : 'Demo Pass'}
                </span>
              </div>

              <div className="flex items-end gap-6 mt-6">
                <div>
                  <div className="hd" style={{ fontSize: 56, lineHeight: 0.9 }}>
                    {audit.data.upgradedScore}
                    <span className="mute text-lg" style={{ fontWeight: 700 }}>
                      /100
                    </span>
                  </div>
                  <div className="mute text-xs mt-1">
                    {isVerifiedOrganic ? 'Verified score' : 'Upgraded rewrite score'}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-bold">{formatRate(cardRate, audit.form.currency)}</div>
                  <div className="mute text-xs">
                    {raisedToFloor ? 'Raised to market floor' : 'Your rate'}
                  </div>
                </div>
              </div>

              <p className="mt-5 text-[15px]" style={{ lineHeight: 1.5 }}>
                {audit.data.oneLiner}
              </p>

              {audit.data.extractedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {audit.data.extractedSkills.map((skill) => (
                    <span key={skill} className="tag">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5">
                <span className="lbl" id="l-look">
                  Looking for
                </span>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="l-look"
                >
                  {LOOK.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className="chip"
                      data-look={l}
                      aria-pressed={lookingFor === l}
                      onClick={() => onLookingForChange(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-dark w-full mt-6"
                id="publish"
                disabled={isPublishing}
                onClick={onPublish}
              >
                {isPublishing
                  ? 'Publishing to Firestore…'
                  : isVerifiedOrganic
                    ? 'Publish to Directory'
                    : 'Publish Demo Card to Directory'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
