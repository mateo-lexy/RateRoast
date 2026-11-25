'use client';

import React, { useEffect, useRef } from 'react';
import { BadgeCheck, Send, Trash2 } from 'lucide-react';
import {
  DirectoryProfile,
  ROLES,
  RoleKey,
  formatRate,
  roleLabel,
} from '@/lib/rateroast';

interface DirectoryViewProps {
  profiles: DirectoryProfile[];
  filter: 'all' | RoleKey;
  onFilterChange: (val: 'all' | RoleKey) => void;
  mineIds: string[];
  isLoading: boolean;
  onOpenCollab: (profile: DirectoryProfile, triggerEl: HTMLButtonElement | null) => void;
  onDeleteCard: (profileId: string) => void;
  onGoToAudit: () => void;
  cascadeElements: (els: Element[]) => void;
}

export function DirectoryView({
  profiles,
  filter,
  onFilterChange,
  mineIds,
  isLoading,
  onOpenCollab,
  onDeleteCard,
  onGoToAudit,
  cascadeElements,
}: DirectoryViewProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const filtered = profiles.filter((p) => filter === 'all' || p.role === filter);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = Array.from(gridRef.current.querySelectorAll('.stg'));
    cascadeElements(cards);
  }, [filter, filtered.length, cascadeElements]);

  const filterOptions: Array<{ k: 'all' | RoleKey; l: string }> = [
    { k: 'all', l: 'All' },
    ...ROLES,
  ];

  const renderBadge = (p: DirectoryProfile) => {
    if (p.isDemoPublish) {
      return (
        <span className="badge mid">
          <BadgeCheck className="ic" aria-hidden="true" />
          {p.score}/100 Demo
        </span>
      );
    }
    if (p.score >= 80) {
      return (
        <span className="badge ok">
          <BadgeCheck className="ic" aria-hidden="true" />
          {p.score}/100 Verified
        </span>
      );
    }
    return (
      <span className={`badge ${p.score < 50 ? 'no' : 'mid'}`}>{p.score}/100</span>
    );
  };

  return (
    <>
      <div className="pt-10 pb-6 md:pt-16">
        <h2
          id="h-dir"
          className="hd"
          style={{ fontSize: 'clamp(2rem,6vw,3.4rem)', lineHeight: 1.04 }}
        >
          Co-Builder Directory
        </h2>
        <p className="mute mt-4 text-base md:text-lg" style={{ maxWidth: '56ch' }}>
          Lapak Rekan: freelancers whose pitches passed the audit, and what each one is looking
          for next.
        </p>
      </div>

      <div
        id="filters"
        className="flex flex-wrap gap-2 mb-5"
        role="group"
        aria-label="Filter by role"
      >
        {filterOptions.map((r) => (
          <button
            key={r.k}
            type="button"
            className="chip"
            data-filter={r.k}
            aria-pressed={filter === r.k}
            onClick={() => onFilterChange(r.k)}
          >
            {r.l}
          </button>
        ))}
      </div>

      <div ref={gridRef} id="grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && profiles.length === 0 ? (
          <div className="glass stg p-8 md:col-span-2 text-center">
            <p className="hd text-xl">Loading directory…</p>
            <p className="mute mt-2">Syncing verified co-builder cards from Firestore.</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((p, i) => {
            const isMine = !p.isSeed && mineIds.includes(p.id);
            return (
              <article
                key={p.id}
                className="glass stg p-5 md:p-6 flex flex-col gap-3"
                style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="hd text-lg truncate">{p.name}</h3>
                    <p className="mute text-sm">
                      {roleLabel(p.role)}
                      {isMine ? ' · Yours' : ''}
                    </p>
                  </div>
                  {renderBadge(p)}
                </div>

                <p className="text-[15px]" style={{ lineHeight: 1.55 }}>
                  {p.line}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="tag">{formatRate(p.rate, p.cur)}</span>
                  <span className="tag">Looking for: {p.looking}</span>
                  {p.skills.map((skill) => (
                    <span key={skill} className="tag">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    type="button"
                    className="btn btn-glass grow"
                    data-collab={p.id}
                    onClick={(e) => onOpenCollab(p, e.currentTarget)}
                  >
                    <Send className="ic" aria-hidden="true" />
                    Request Collab
                  </button>
                  {isMine ? (
                    <button
                      type="button"
                      className="btn btn-glass sq"
                      data-del={p.id}
                      aria-label={`Remove ${p.name} card`}
                      onClick={() => onDeleteCard(p.id)}
                    >
                      <Trash2 className="ic" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="glass stg p-8 md:col-span-2 text-center">
            <p className="hd text-xl">
              No {filter === 'all' ? 'Co-Builder' : roleLabel(filter)}s yet
            </p>
            <p className="mute mt-2">
              Run an audit and publish your card to be the first.
            </p>
            <button
              type="button"
              className="btn btn-dark mt-5"
              data-tab="audit"
              onClick={onGoToAudit}
            >
              Audit my pitch
            </button>
          </div>
        )}
      </div>
    </>
  );
}
