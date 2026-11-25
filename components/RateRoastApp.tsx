'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import {
  AuditFormInput,
  AuditResult,
  CurrencyKey,
  DirectoryProfile,
  EXAMPLE_BAD_PITCH,
  LOOK,
  LookingFor,
  RoleKey,
  SEED_PROFILES,
  computeCardRate,
  normalizeHandle,
  validateAuditInput,
} from '@/lib/rateroast';
import {
  deleteDirectoryProfile,
  ensureSeedProfiles,
  publishProfileToDirectory,
  subscribeDirectoryProfiles,
  submitCollabRequest,
  testConnection,
} from '@/lib/firebase';
import { AuditView } from './AuditView';
import { DirectoryView } from './DirectoryView';
import { CollabModal } from './CollabModal';

type TabKey = 'audit' | 'directory';

const MINE_IDS_KEY = 'rateroast.mineIds.v1';

export function RateRoastApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('audit');
  const reducedMotion = useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );

  // Audit form state
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<RoleKey>('ai');
  const [currency, setCurrency] = useState<CurrencyKey>('usd');
  const [rate, setRate] = useState('');
  const [pitch, setPitch] = useState('');
  const [formError, setFormError] = useState('');

  // Audit execution & results
  const [isLoading, setIsLoading] = useState(false);
  const [loaderExiting, setLoaderExiting] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [audit, setAudit] = useState<{ form: AuditFormInput; data: AuditResult } | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor>(LOOK[0]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Directory state (backed by Firestore)
  const [profiles, setProfiles] = useState<DirectoryProfile[]>(SEED_PROFILES);
  const [dirLoading, setDirLoading] = useState(true);
  const [dirFilter, setDirFilter] = useState<'all' | RoleKey>('all');
  const [mineIds, setMineIds] = useState<string[]>([]);

  // Modal & Toast state
  const [modalProfile, setModalProfile] = useState<DirectoryProfile | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Refs for DOM, Lenis, GSAP, focus restoration, timers
  const navRef = useRef<HTMLElement | null>(null);
  const viewAuditRef = useRef<HTMLElement | null>(null);
  const viewDirRef = useRef<HTMLElement | null>(null);
  const handleInputRef = useRef<HTMLInputElement | null>(null);
  const rateInputRef = useRef<HTMLInputElement | null>(null);
  const pitchInputRef = useRef<HTMLTextAreaElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const modalOpenerRef = useRef<HTMLButtonElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapCleanupRef = useRef<(() => void) | null>(null);
  const prevTabRef = useRef<TabKey>('audit');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2400);
  }, []);

  const copyText = useCallback(async (txt: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(txt);
      return true;
    } catch {
      try {
        const a = document.createElement('textarea');
        a.value = txt;
        a.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(a);
        a.select();
        const ok = document.execCommand('copy');
        a.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const scrollToEl = useCallback((el: HTMLElement | null, center = false) => {
    if (!el) return;
    const navH = navRef.current?.offsetHeight ?? 72;
    const offset = center
      ? -(window.innerHeight - el.offsetHeight) / 2
      : -(navH + 12);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset, duration: 1.2 });
    } else {
      el.scrollIntoView({
        behavior: 'smooth',
        block: center ? 'center' : 'start',
      });
    }
  }, []);

  const cascadeElements = useCallback(
    (els: Element[]) => {
      if (!els.length || reducedMotion) return;
      gsap.fromTo(
        els,
        { y: 18, scale: 0.98, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.48,
          ease: 'power3.out',
          stagger: 0.06,
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        }
      );
    },
    [reducedMotion]
  );

  // Load saved mineIds from localStorage asynchronously to avoid synchronous setState in effect
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(localStorage.getItem(MINE_IDS_KEY) || '[]');
        if (Array.isArray(saved)) {
          setMineIds(saved.filter((x) => typeof x === 'string'));
        }
      } catch {
        setMineIds([]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Initialize GSAP + Lenis + tactile press animations with strict unmount cleanup
  useEffect(() => {
    const rm = reducedMotion;
    document.documentElement.classList.add('gs');

    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    if (!rm) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenisRef.current = lenis;
      tickerFn = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    let pressed: HTMLElement | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (rm) return;
      const target = (e.target as HTMLElement | null)?.closest(
        '.btn-dark,.chip,#grid article'
      ) as HTMLElement | null;
      if (!target || (target as HTMLButtonElement).disabled) return;
      pressed = target;
      gsap.to(target, {
        scale: 0.97,
        duration: 0.18,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    const onPointerRelease = () => {
      if (!pressed) return;
      const target = pressed;
      pressed = null;
      gsap.to(target, {
        scale: 1,
        duration: 0.4,
        ease: 'back.out(2)',
        overwrite: 'auto',
        clearProps: 'transform',
      });
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerRelease);
    document.addEventListener('pointercancel', onPointerRelease);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerRelease);
      document.removeEventListener('pointercancel', onPointerRelease);
      if (tickerFn) gsap.ticker.remove(tickerFn);
      gsap.killTweensOf('.stg,.btn-dark,.chip,#grid article');
      if (lenis) {
        lenis.start();
        lenis.destroy();
        lenisRef.current = null;
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (swapCleanupRef.current) swapCleanupRef.current();
      document.documentElement.classList.remove('gs');
    };
  }, [reducedMotion]);

  // Initialize Firebase connection check, seed data if empty, and real-time directory listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    async function bootFirestore() {
      await testConnection();
      try {
        await ensureSeedProfiles();
      } catch (err) {
        console.error('Seed check error:', err);
      }
      if (cancelled) return;
      unsubscribe = subscribeDirectoryProfiles(
        (items) => {
          setProfiles(items.length > 0 ? items : SEED_PROFILES);
          setDirLoading(false);
        },
        (err) => {
          console.error('Firestore directory subscription error:', err);
          setDirLoading(false);
          showToast('Could not sync directory. Showing cached profiles.');
        }
      );
    }

    bootFirestore();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [showToast]);

  // Directional iOS spring view transition
  const switchTab = useCallback(
    (nextTab: TabKey, updateHash = true) => {
      if (updateHash && typeof window !== 'undefined') {
        const targetHash = `#${nextTab}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = nextTab;
        }
      }
      const prev = prevTabRef.current;
      if (nextTab === prev) return;
      prevTabRef.current = nextTab;

      const outEl = prev === 'audit' ? viewAuditRef.current : viewDirRef.current;
      const inEl = nextTab === 'audit' ? viewAuditRef.current : viewDirRef.current;
      const dir = nextTab === 'directory' ? 1 : -1;

      setActiveTab(nextTab);
      scrollToTop();

      if (outEl && inEl && !reducedMotion) {
        if (swapCleanupRef.current) swapCleanupRef.current();
        outEl.classList.add('anim', 'view-abs');
        inEl.classList.add('anim');
        inEl.hidden = false;
        inEl.style.transition = 'none';
        inEl.style.transform = `translateX(${dir * 24}px)`;
        inEl.style.opacity = '0';
        void inEl.offsetWidth;
        inEl.style.transition = '';
        inEl.style.transform = '';
        inEl.style.opacity = '';
        outEl.style.transform = `translateX(${-dir * 24}px) scale(.98)`;
        outEl.style.opacity = '0';

        const finish = () => {
          clearTimeout(timer);
          outEl.hidden = true;
          outEl.classList.remove('anim', 'view-abs');
          outEl.style.transform = '';
          outEl.style.opacity = '';
          inEl.classList.remove('anim');
          swapCleanupRef.current = null;
        };
        const timer = setTimeout(finish, 440);
        swapCleanupRef.current = finish;
      } else {
        if (outEl) outEl.hidden = true;
        if (inEl) inEl.hidden = false;
      }
    },
    [reducedMotion, scrollToTop]
  );

  // Hashchange listener
  useEffect(() => {
    const syncFromHash = () => {
      const to: TabKey =
        window.location.hash === '#directory' ? 'directory' : 'audit';
      if (to !== prevTabRef.current) {
        switchTab(to, false);
      } else {
        if (viewAuditRef.current) viewAuditRef.current.hidden = to !== 'audit';
        if (viewDirRef.current) viewDirRef.current.hidden = to !== 'directory';
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [switchTab]);

  // Lenis scroll lock when modal opens/closes
  useEffect(() => {
    if (modalProfile) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [modalProfile]);

  const handleCurrencyChange = (nextCur: CurrencyKey) => {
    setCurrency(nextCur);
  };

  const handleFillExample = () => {
    setHandle(EXAMPLE_BAD_PITCH.handle);
    setRole(EXAMPLE_BAD_PITCH.role);
    setCurrency(EXAMPLE_BAD_PITCH.currency);
    setRate(EXAMPLE_BAD_PITCH.rate);
    setPitch(EXAMPLE_BAD_PITCH.pitch);
    setFormError('');
  };

  const handleRoast = async () => {
    const numericRate = parseFloat(rate);
    const trimmedPitch = pitch.trim();
    const validationErr = validateAuditInput({
      rate: numericRate,
      pitch: trimmedPitch,
      role,
      currency,
    });

    if (validationErr) {
      setFormError(validationErr);
      if (validationErr.toLowerCase().includes('rate')) {
        rateInputRef.current?.focus();
      } else {
        pitchInputRef.current?.focus();
      }
      return;
    }

    setFormError('');
    const form: AuditFormInput = {
      handle: normalizeHandle(handle),
      role,
      currency,
      rate: numericRate,
      pitch: trimmedPitch,
    };

    setIsLoading(true);
    setLoaderExiting(false);
    setLoaderStep(0);
    setAudit(null);

    requestAnimationFrame(() => {
      if (loaderRef.current) {
        cascadeElements([loaderRef.current]);
        scrollToEl(loaderRef.current);
      }
    });

    const t1 = setTimeout(() => setLoaderStep(1), 350);
    const t2 = setTimeout(() => setLoaderStep(2), 700);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          typeof payload.error === 'string'
            ? payload.error
            : 'The audit failed. Check your connection and try again.';
        throw new Error(message);
      }

      const data = payload as unknown as AuditResult;
      setLoaderStep(3);
      setIsLoading(false);
      setLoaderExiting(false);
      setAudit({ form, data });

      requestAnimationFrame(() => {
        scrollToEl(resultsRef.current);
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'The audit failed. Check your connection and try again.';
      setFormError(msg);
      showToast(msg);
      setIsLoading(false);
      setLoaderExiting(false);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  };

  const handlePublish = async () => {
    if (!audit || isPublishing) return;
    const effectiveHandle = normalizeHandle(audit.form.handle || handle);
    if (!effectiveHandle) {
      showToast('Add a name or handle in the form first.');
      scrollToEl(handleInputRef.current, true);
      handleInputRef.current?.focus({ preventScroll: true });
      return;
    }

    setIsPublishing(true);
    const isDemoPublish = audit.data.score < 75;
    const newId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cardRate = computeCardRate(
      audit.form.rate,
      audit.form.currency,
      audit.form.role
    );

    try {
      const saved = await publishProfileToDirectory({
        id: newId,
        name: effectiveHandle,
        role: audit.form.role,
        rate: cardRate,
        cur: audit.form.currency,
        score: audit.data.upgradedScore,
        originalScore: audit.data.score,
        isDemoPublish,
        line: audit.data.oneLiner,
        rewrittenPitch: audit.data.rewrittenPitch,
        looking: lookingFor,
        skills: audit.data.extractedSkills,
        contacts: [{ label: 'Handle', value: effectiveHandle }],
        isSeed: false,
      });

      const nextMine = [saved.id, ...mineIds];
      setMineIds(nextMine);
      try {
        localStorage.setItem(MINE_IDS_KEY, JSON.stringify(nextMine));
      } catch {
        // ignore storage quota
      }

      setProfiles((prev) => {
        const withoutDup = prev.filter((p) => p.id !== saved.id);
        return [saved, ...withoutDup];
      });

      showToast('Published to the directory.');
      setDirFilter('all');
      switchTab('directory');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to publish to directory.';
      showToast(msg.includes('{') ? 'Failed to save card to Firestore.' : msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteCard = async (profileId: string) => {
    try {
      await deleteDirectoryProfile(profileId);
      const nextMine = mineIds.filter((id) => id !== profileId);
      setMineIds(nextMine);
      try {
        localStorage.setItem(MINE_IDS_KEY, JSON.stringify(nextMine));
      } catch {
        // ignore
      }
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      showToast('Card removed.');
    } catch {
      showToast('Could not remove card.');
    }
  };

  const handleOpenCollab = (
    profile: DirectoryProfile,
    triggerEl: HTMLButtonElement | null
  ) => {
    modalOpenerRef.current = triggerEl;
    setModalProfile(profile);
  };

  const handleCloseCollab = useCallback(() => {
    setModalProfile(null);
    const opener = modalOpenerRef.current;
    if (opener && typeof opener.focus === 'function') {
      setTimeout(() => opener.focus({ preventScroll: true }), 40);
    }
  }, []);

  const handleSendCollabPing = async (input: {
    targetProfileId: string;
    targetName: string;
    senderHandle: string;
    message: string;
  }) => {
    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await submitCollabRequest({
      id: reqId,
      ...input,
    });
  };

  return (
    <>
      <div className="amb" />

      <header ref={navRef} className="nav">
        <div className="navin mx-auto" style={{ maxWidth: 960 }}>
          <div className="hd text-xl" style={{ whiteSpace: 'nowrap' }}>
            RateRoast<span style={{ color: 'var(--coral)' }}>.</span>
            <span className="beta">BETA</span>
          </div>

          <div
            className="seg tabs"
            id="tabs"
            role="tablist"
            aria-label="Views"
            data-active={activeTab}
          >
            <span className="seg-pill" aria-hidden="true" />
            <button
              role="tab"
              id="tab-audit"
              type="button"
              aria-selected={activeTab === 'audit'}
              data-tab="audit"
              onClick={() => switchTab('audit')}
            >
              Audit &amp; Roast
            </button>
            <button
              role="tab"
              id="tab-dir"
              type="button"
              aria-selected={activeTab === 'directory'}
              data-tab="directory"
              onClick={() => switchTab('directory')}
            >
              <span>
                <span className="hidden sm:inline">Co-Builder </span>Directory
              </span>
              <span className="cnt" id="count">
                {profiles.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 pb-24" style={{ maxWidth: 960 }}>
        <div id="views">
          <section
            ref={viewAuditRef}
            id="view-audit"
            className="view"
            aria-labelledby="h-audit"
          >
            <AuditView
              handle={handle}
              onHandleChange={setHandle}
              role={role}
              onRoleChange={setRole}
              currency={currency}
              onCurrencyChange={handleCurrencyChange}
              rate={rate}
              onRateChange={setRate}
              pitch={pitch}
              onPitchChange={setPitch}
              error={formError}
              isLoading={isLoading}
              loaderExiting={loaderExiting}
              loaderStep={loaderStep}
              audit={audit}
              lookingFor={lookingFor}
              onLookingForChange={setLookingFor}
              isPublishing={isPublishing}
              onFillExample={handleFillExample}
              onRoast={handleRoast}
              onPublish={handlePublish}
              onCopyText={copyText}
              onToast={showToast}
              reducedMotion={reducedMotion}
              handleInputRef={handleInputRef}
              rateInputRef={rateInputRef}
              pitchInputRef={pitchInputRef}
              loaderRef={loaderRef}
              resultsRef={resultsRef}
              cascadeElements={cascadeElements}
            />
          </section>

          <section
            ref={viewDirRef}
            id="view-dir"
            className="view"
            aria-labelledby="h-dir"
            hidden
          >
            <DirectoryView
              profiles={profiles}
              filter={dirFilter}
              onFilterChange={setDirFilter}
              mineIds={mineIds}
              isLoading={dirLoading}
              isActive={activeTab === 'directory'}
              onOpenCollab={handleOpenCollab}
              onDeleteCard={handleDeleteCard}
              onGoToAudit={() => switchTab('audit')}
              cascadeElements={cascadeElements}
            />
          </section>
        </div>
      </main>

      <CollabModal
        profile={modalProfile}
        onClose={handleCloseCollab}
        onCopyText={copyText}
        onToast={showToast}
        onSendCollabPing={handleSendCollabPing}
      />

      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={toastVisible ? 'show' : ''}
      >
        {toastMsg}
      </div>
    </>
  );
}
