'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Send, X } from 'lucide-react';
import {
  DirectoryProfile,
  formatRate,
  roleLabel,
  validateCollabInput,
} from '@/lib/rateroast';

interface CollabModalProps {
  profile: DirectoryProfile | null;
  onClose: () => void;
  onCopyText: (txt: string) => Promise<boolean>;
  onToast: (msg: string) => void;
  onSendCollabPing: (input: {
    targetProfileId: string;
    targetName: string;
    senderHandle: string;
    message: string;
  }) => Promise<void>;
}

function buildDefaultMessage(profile: DirectoryProfile): string {
  const firstName = profile.name.replace(/^@/, '').split(' ')[0];
  return `Hi ${firstName}, I found your RateRoast card and “${profile.line}” stood out. I’m working on something where a strong ${roleLabel(profile.role).toLowerCase()} would change the outcome, and I’d like to talk about collaborating. Open to a 15-minute call this week?`;
}

interface CollabModalSheetProps {
  profile: DirectoryProfile;
  onClose: () => void;
  onCopyText: (txt: string) => Promise<boolean>;
  onToast: (msg: string) => void;
  onSendCollabPing: CollabModalProps['onSendCollabPing'];
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
}

function CollabModalSheet({
  profile,
  onClose,
  onCopyText,
  onToast,
  onSendCollabPing,
  closeBtnRef,
}: CollabModalSheetProps) {
  const [senderHandle, setSenderHandle] = useState('');
  const [message, setMessage] = useState(() => buildDefaultMessage(profile));
  const [pingError, setPingError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleCopyMessage = async () => {
    const ok = await onCopyText(message);
    onToast(ok ? 'Message copied.' : 'Copy failed. Select and copy manually.');
  };

  const handleCopyContact = async (value: string) => {
    const ok = await onCopyText(value);
    onToast(ok ? 'Copied.' : 'Copy failed. Select and copy manually.');
  };

  const handleSendPing = async () => {
    if (isSending || isConfirmed) return;
    const err = validateCollabInput({ senderHandle, message });
    if (err) {
      setPingError(err);
      return;
    }
    setPingError('');
    setIsSending(true);
    try {
      await onSendCollabPing({
        targetProfileId: profile.id,
        targetName: profile.name,
        senderHandle: senderHandle.trim(),
        message: message.trim(),
      });
      setIsConfirmed(true);
      onToast(`Collab ping sent to ${profile.name}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not send collab ping.';
      setPingError(msg);
      onToast('Failed to send collab ping.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="glass sheet p-6 w-full"
      role="dialog"
      aria-modal="true"
      aria-labelledby="m-title"
      style={{ maxWidth: 480, background: 'var(--pill)', maxHeight: '90vh', overflowY: 'auto' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="m-title" className="hd text-xl truncate">
            {profile.name}
          </h3>
          <p id="m-sub" className="mute text-sm">
            {roleLabel(profile.role)} · {formatRate(profile.rate, profile.cur)}
          </p>
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          className="btn btn-glass sq"
          id="m-close"
          aria-label="Close modal"
          onClick={onClose}
        >
          <X className="ic" aria-hidden="true" />
        </button>
      </div>

      <label className="lbl mt-5" htmlFor="m-sender">
        Your handle or email
      </label>
      <input
        id="m-sender"
        className="field"
        type="text"
        placeholder="@yourhandle or you@studio.co"
        value={senderHandle}
        onChange={(e) => setSenderHandle(e.target.value)}
        disabled={isConfirmed}
      />

      <label className="lbl mt-4" htmlFor="m-msg">
        Intro message
      </label>
      <textarea
        id="m-msg"
        className="field"
        style={{ minHeight: 120 }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isConfirmed}
      />

      {pingError ? (
        <p
          role="alert"
          className="text-sm font-semibold mt-2"
          style={{ color: 'var(--coral-ink)' }}
        >
          {pingError}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <button
          className="btn btn-dark flex-1"
          id="m-send"
          type="button"
          disabled={isSending || isConfirmed}
          onClick={handleSendPing}
        >
          {isConfirmed ? (
            <>
              <Check className="ic" aria-hidden="true" /> Ping Sent
            </>
          ) : (
            <>
              <Send className="ic" aria-hidden="true" />
              {isSending ? 'Sending…' : 'Send Collab Ping'}
            </>
          )}
        </button>
        <button
          className="btn btn-glass"
          id="m-copy"
          type="button"
          onClick={handleCopyMessage}
        >
          <Copy className="ic" aria-hidden="true" /> Copy
        </button>
      </div>

      {isConfirmed ? (
        <div
          className="mt-3 p-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
          style={{ background: 'var(--green-bg)', color: 'var(--green-ink)' }}
        >
          <Check className="ic" aria-hidden="true" />
          Collaboration ping logged for {profile.name}.
        </div>
      ) : null}

      <div id="m-contacts" className="grid gap-2 mt-5">
        {profile.contacts.map((c, idx) => (
          <div
            key={`${c.label}-${idx}`}
            className="flex items-center justify-between gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--field)', border: '1px solid var(--line)' }}
          >
            <div className="min-w-0">
              <div className="mute text-xs">{c.label}</div>
              <div className="font-semibold truncate">{c.value}</div>
            </div>
            <button
              type="button"
              className="btn btn-glass sq"
              data-cc={idx}
              aria-label={`Copy ${c.label}`}
              onClick={() => handleCopyContact(c.value)}
            >
              <Copy className="ic" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollabModal({
  profile,
  onClose,
  onCopyText,
  onToast,
  onSendCollabPing,
}: CollabModalProps) {
  const [visibleProfile, setVisibleProfile] = useState<DirectoryProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (profile) {
      const raf1 = requestAnimationFrame(() => {
        setVisibleProfile(profile);
        requestAnimationFrame(() => {
          setIsOpen(true);
          closeBtnRef.current?.focus({ preventScroll: true });
        });
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      const raf = requestAnimationFrame(() => {
        setIsOpen(false);
      });
      const timer = setTimeout(() => {
        setVisibleProfile(null);
      }, 380);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [profile]);

  useEffect(() => {
    if (!visibleProfile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visibleProfile, onClose]);

  return (
    <div
      id="modal"
      data-lenis-prevent
      hidden={!visibleProfile}
      className={isOpen ? 'open' : ''}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {visibleProfile ? (
        <CollabModalSheet
          key={visibleProfile.id}
          profile={visibleProfile}
          onClose={onClose}
          onCopyText={onCopyText}
          onToast={onToast}
          onSendCollabPing={onSendCollabPing}
          closeBtnRef={closeBtnRef}
        />
      ) : null}
    </div>
  );
}
