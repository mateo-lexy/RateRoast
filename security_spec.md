# RateRoast Security Specification

## 1. Data Invariants
1. **Strict Schema Enforcement**: Every document written to `/directory_profiles/{profileId}` and `/collab_requests/{requestId}` must pass `hasAll` and `hasOnly` key checks, exact type checks, and strict `.size()` bounds. No shadow fields are permitted.
2. **Path Variable Hardening**: All `{profileId}` and `{requestId}` path variables must match `^[a-zA-Z0-9_\-]+$` and be <= 128 chars.
3. **Seed Protection & Immutability**: Published directory profiles are immutable (`allow update: if false`), and seeded profiles (`isSeed == true`) cannot be deleted (`allow delete: if existing().isSeed == false`).
4. **Relational Integrity for Collab Pings**: A document in `/collab_requests/{requestId}` cannot be created unless `targetProfileId` references an existing document in `/directory_profiles`.
5. **PII / Inbox Isolation**: `/collab_requests` is strictly write-only (`allow read, update, delete: if false`) so visitors cannot enumerate or scrape messages sent to co-builders.
6. **Temporal Integrity**: `createdAt` must strictly equal `request.time` on creation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Shadow field injection on `/directory_profiles`: adding `isAdmin: true` or `verifiedOverride: true`.
2. Oversized document ID on `/directory_profiles/{profileId}` (> 128 chars or invalid characters like `../../admin`).
3. Invalid role enum on `/directory_profiles`: `role: "superuser"`.
4. Invalid currency enum on `/directory_profiles`: `cur: "btc"`.
5. Negative or zero rate on `/directory_profiles`: `rate: -50`.
6. Score out of bounds on `/directory_profiles`: `score: 999`.
7. Oversized `skills` array (> 3 items) or non-string skill element.
8. Oversized `rewrittenPitch` (> 2000 chars) attempting storage exhaustion.
9. Client-forged `createdAt` timestamp not equal to `request.time`.
10. Deleting a seeded profile (`isSeed == true`) or updating any existing profile.
11. Orphaned `/collab_requests` payload pointing to a non-existent `targetProfileId`.
12. Reading/listing `/collab_requests` to scrape visitor handles and messages.
