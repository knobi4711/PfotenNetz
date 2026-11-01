# PfotenNetz threat model

This file tells the scanner what PfotenNetz is, where untrusted input enters, what we
consider in scope, and how we rate severity. It describes intent, not known bugs.

## What the project is

PfotenNetz is a neighbourhood pet-care platform (German UI): owners look for helpers who
walk, feed or sit their pets; helpers publish availability; both sides book, chat, track a
walk live, and settle the visit in a "timebank" of credits. Around that sit hazard reports
on a map, missing-pet reports with sightings, community events, moderation, helper
verification, and public emergency cards for a pet (a QR code a finder can scan to reach
the owner and see medical notes).

Monorepo layout:

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 15 App Router, React 19. Client-side rendering and data fetching; no API routes, no route handlers, no middleware, no server actions, no server-side Supabase client |
| `apps/mobile` | Expo SDK 57 / React Native 0.86, expo-router, background location, push, passkeys |
| `packages/supabase` | Every query and mutation, plus generated DB types. The only place that talks to the backend |
| `packages/shared` | Zod schemas, booking/timebank/geocoding/routing rules, formatters |
| `packages/native` | SecureStore, location, local authentication wrappers |
| `packages/design-system`, `packages/testing` | UI kit, test utilities |
| `supabase/migrations` | 101 SQL migrations: the entire backend, including all authorisation |

Backend: hosted Supabase — Postgres + PostGIS, Row Level Security on every application
table, Storage buckets, Realtime, Auth (email/password and passkeys). There are **no edge
functions** (`supabase/functions` is empty) and **no service-role key anywhere in shipped
code**: web and mobile both ship only the public anon key. That is deliberate. Every
authorisation decision is therefore made in Postgres, by RLS policies and `SECURITY
DEFINER` functions. This is where we expect real vulnerabilities to live, and where a
report is most valuable.

## Actors and trust boundaries

- **anon** — no session. Can read very little on purpose: `get_public_emergency_card(token)`
  and `spatial_ref_sys` (PostGIS system table). Anything else readable without a session is
  a finding.
- **authenticated** — any signed-up account, including accounts created by an attacker.
  Assume unlimited account creation and full control of every request the clients can send.
- **helper** — an account with `trust_level` above `basic` and/or a completed verification.
- **admin** — `profiles.role = 'admin'`. Admin RPCs and policies gate moderation, helper
  verification, booking visibility and user reports.
- **holder of an emergency-card link** — unauthenticated, holds a bearer token in a URL.
- **third parties** — Supabase (auth, storage, realtime), Expo push, map/geocoding tile
  providers, Google Play / App Store. Out of scope.

Client trust: none. Treat the Next.js bundle and the Expo bundle as attacker-controlled
input to the backend. A check that exists only in TypeScript/Zod on the client is not a
check.

## Data that matters, and what "leaked" means

1. **Precise location.** Live walk tracking (`tracking_*` tables, `tracking_live_position`,
   server telemetry), helper search by radius, booking locations, private booking
   addresses, geofences. A leak here can mean physical stalking.
2. **Emergency/medical data.** Pet medications, allergies, special needs, microchip number,
   vet and insurance details, owner contact — published by design to whoever holds a valid
   emergency-card token.
3. **Private conversations.** Booking chats and private contact-request chats, including
   voice notes and images in the `booking-chat-media` bucket.
4. **Verification documents.** ID / background-check uploads in the `verification-docs`
   bucket, readable by owner and admins only.
5. **Identity.** Email, phone, display name, avatar, address, role, trust level.
6. **Timebank credits and booking money fields.** Virtual credits and per-visit
   compensation. No real payment processing exists, so credit manipulation is an integrity
   and fairness issue, not theft of money.
7. **Minors.** The platform carries child-protection content and is plausibly used by
   teenagers. When a leak concerns a minor's identity or location, raise severity one step.

## Entry points to review

**RLS policies** (all of `supabase/migrations`, plus `packages/supabase/src/types/database.ts`).
Look for `USING` without a matching `WITH CHECK`, policies that join through another table
whose own policy is permissive, `FOR ALL` policies on tables that should be read-only,
`USING (true)`, and fixes that traded correctness for a quick recursion fix (e.g.
`037_fix_community_rls_recursion.sql`).

**`SECURITY DEFINER` functions.** They run as the owner and bypass RLS. We want to know
about any function that (a) is executable by `anon` or `authenticated`, (b) does not
re-derive the caller from `auth.uid()`, (c) takes ids or owner ids as parameters and trusts
them, (d) lacks `SET search_path`, or (e) writes tables the caller could not write. Examples
worth attention: emergency-card link creation/revocation, `delete_own_account`,
`record_hazard_sighting`, `nearby_helper_search` / `find_nearby_helpers`,
`get_active_hazards_in_radius`, timebank settlement, admin verification and moderation
RPCs, booking creation and status transitions, `is_admin()` itself.

**Privilege boundaries.** `profiles.role` and `profiles.trust_level` are server-managed and
protected by a trigger (`023_protect_profile_security_fields.sql`, later amended). Any path
that lets a user promote themselves, approve their own verification, keep an admin role
through an unrelated update, or write `profiles` rows of other users is critical.

**Storage.** Buckets: `avatars` (public), `pet-photos` (participants), `hazard-photos`
(private, signed URLs), `verification-docs` (owner/admin), `booking-chat-media` (booking
participants). Policies key on path prefixes and folder names, so check path parsing:
traversal, case/encoding differences, a path that satisfies two policies, uploads with a
foreign `owner_id` folder, and MIME/size limits actually enforced.

**Public emergency cards.** `emergency_card_links` stores `sha256(token)`, with expiry and
revocation; `get_public_emergency_card` is `SECURITY DEFINER` and granted to `anon`. Token
generation happens in the caller, so check where tokens are produced (entropy, reuse
across pets/users), whether expiry and revocation are honoured on every path, whether the
function can be used to enumerate or probe, and whether errors/timing distinguish "no such
token" from "expired".

**Realtime.** Subscriptions are authorised through RLS at subscribe time. Check that a
channel name or filter cannot widen what a subscriber receives (messages, notifications,
live positions).

**Client surfaces.** Passkey and session handling (`packages/native`, `expo-secure-store`,
`react-native-passkeys`, localStorage on web), deep links and QR payloads (`pfotennetz://`,
`/emergency/[token]`, hazard and missing-pet links), URL parameters on web pages, image and
link rendering of user content (pet names, hazard and missing-pet descriptions, chat,
profile fields). The web app renders React text nodes only — we found no
`dangerouslySetInnerHTML` — so stored XSS would have to come from a new sink: a URL scheme,
`href`, `src`, an iframe/webview, or a map popup.

## Deliberately public, not a finding

- Hazard and missing-pet reports, their approximate location and photos, visible to
  authenticated users nearby.
- Community events and moderation pages.
- Avatars, and pet photos to booking participants.
- Emergency cards to holders of a valid token.
- Any user's display name, avatar and public helper profile.

## Severity calibration

| Severity | Our reading |
| --- | --- |
| critical | Unauthenticated access to private data at scale; RLS bypass or SQL injection in a `SECURITY DEFINER` function; auth or session forgery; admin takeover; code execution in the web server or app bundle |
| high | Cross-user access with an ordinary account (IDOR) to location, address, chat content, verification documents, emergency/medical data or private bookings; privilege or trust-level escalation; stored XSS reaching another user (sessions live in localStorage, so it means account takeover); enumeration of emergency-card tokens; integrity bugs that mint or transfer timebank credits at scale; any leak concerning a minor |
| medium | Metadata-only leaks (record existence, timestamps, counts); privacy leak limited to a coarse area (roughly >1 km fuzz); missing rate limit on a secret with ≥128 bits of entropy; self-XSS; DoS that needs an account and gives little amplification; leaking data the user already published |
| low | Missing security headers, verbose errors, clickjacking on non-sensitive pages, open redirect without token leakage, unreachable dependency CVEs, best-practice gaps with no demonstrated impact |

Rate the demonstrated impact, not the category. A missing `WITH CHECK` on a table nobody
can write is low; the same gap on `profiles` is critical. Say plainly when a finding needs
a precondition we consider unrealistic, and say what that precondition is.

## Out of scope

- Supabase, PostGIS, Expo, Next.js, React and npm dependencies themselves (report only if
  reachable through our code).
- CI/CD, deployment (`deployment/`), release scripts
  (`scripts/upload-google-play-local.mjs`), signing keys, EAS/Google Play/Apple
  credentials, and anything else that needs secrets we do not ship in the image.
- The hosted production database and its data.
- Native Android/iOS toolchains: the image has no SDKs, so native code is reviewed as
  source only.
- Social engineering, spam content, and moderation policy quality.

## What the audit environment can and cannot do

- Node 22, pnpm 9, dependencies installed, `pnpm build` (Next.js, standalone output) and
  `pnpm test` (Vitest, fully mocked) already run in the image.
- **There is no Postgres and no Supabase instance in the image**, and no network during the
  audit. Database behaviour cannot be exercised live. Findings should therefore be derived
  from the migrations, and reproducers should be SQL that a human can run against
  `supabase start`, or a described request sequence — not a live exploit against a server.
- Mobile code runs only under Node (unit tests); no emulator, no device.

## How we like reports and patches

- Point at the exact file and line, e.g.
  `supabase/migrations/023_protect_profile_security_fields.sql:31`, and quote the policy or
  function body you are reasoning about.
- State the attacker model: anon, ordinary account, helper, admin, or emergency-link holder.
- For a database fix, propose a **new** timestamped migration
  (`supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`). Do not edit migrations that
  have already been applied. Follow the existing style: explicit `REVOKE`/`GRANT`,
  `SET search_path` on `SECURITY DEFINER`, comments in English.
- For client code, propose a minimal diff against `apps/` or `packages/`, keeping the
  existing TypeScript strictness, Zod validation at the boundary, and German user-facing
  strings.
- One finding per report, with the smallest patch that closes it. If a fix would change
  product behaviour (for example hiding a field that is currently public by design), say so
  instead of silently changing it.
