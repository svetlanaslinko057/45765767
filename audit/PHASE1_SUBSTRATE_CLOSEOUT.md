# Phase 1 — Substrate Closeout Matrix

Tracks progress through 6 concept slices toward operational substrate closure.
**Not narrative. Matrix only.**

Doctrine reference: [`SUBSTRATE_CONTRACT.md`](./SUBSTRATE_CONTRACT.md)
Endpoint registry: [`ENDPOINT_FAMILY_REGISTRY.md`](./ENDPOINT_FAMILY_REGISTRY.md)

---

## 0. Surfaces (slice order)

| # | Concept | Closes |
|---|---|---|
| 1 | ClientDeliverable | Delivery lifecycle |
| 2 | ClientVersions | Chronology lifecycle |
| 3 | ClientCabinet | Cabinet overview |
| 4 | DeveloperGrowth | Career lifecycle |
| 5 | DeveloperWork | Execution lifecycle |
| 6 | ProviderInbox | Communication lifecycle |

Together these stabilize the operational graph.

---

## 1. Status legend

| Status | Meaning |
|---|---|
| `pending` | Not started |
| `audit` | Audit complete, no code touched |
| `in-flight` | Implementation in progress |
| `frozen` | Meets DoD; no drift detected by grep contract |
| `carved-out` | Deferred to a later slice with documented carve-out |

---

## 2. Definition of Done (per slice)

A slice is `frozen` only when **all** of the following hold:

1. No forbidden client derivation (grep §2 of `SUBSTRATE_CONTRACT.md` = 0 in surface files)
2. Page composed from independent backend contracts (I-09)
3. No optimistic local mutation (I-05)
4. Loading / error / empty separated structurally (I-10)
5. Web ↔ mobile semantic parity verified (both surfaces exist; same field shape; same status enum)
6. Smoke tested live against backend (manual or testing agent against doctrine probes)
7. No new bounded debt introduced; existing debt unchanged unless slice-owned
8. No convenience state (I-02)
9. `data-testid` only on interactive/action-critical nodes
10. Backend changes (if any) are strictly additive per I-06 and recorded in §6 below

`request_id` propagation is **out of scope for Phase 1**.

---

## 3. Slice matrix

| # | Surface | Web file | Mobile file | Forbidden grammar count | Independent GETs | POST→refresh | Backend gaps | Web/Mobile parity | Smoke | Status | Contract owner | Last verified commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ClientDeliverable | `web/src/pages/ClientDeliverablePage.js` | **missing** — to create `frontend/app/client/deliverable/[id].tsx` | `.filter` ×3 (lines 127–129) | 1 GET (current); target 1 canonical GET | ❌ optimistic mutation lines 62, 81 | wrong family (B legacy); see §5 | ❌ no mobile counterpart screen | not run | `audit` | — | `54c05b9` | Drives endpoint-family resolution (registry concept #1). |
| 2 | ClientVersions | `web/src/pages/ClientVersionsPage.js` | — | — | — | — | — | — | — | `pending` | — | — | — |
| 3 | ClientCabinet | `web/src/pages/ClientCabinet.js` | `frontend/app/client/*` (multiple) | — | — | — | — | — | — | `pending` | — | — | Absorbs BD-04 (useMemo carve-out from slice #1). |
| 4 | DeveloperGrowth | `web/src/pages/DeveloperGrowthPage.js` (verify exists) | `frontend/app/developer/growth.tsx` | — | — | — | — | — | — | `pending` | — | — | — |
| 5 | DeveloperWork | `web/src/pages/DeveloperWorkPage.js` (verify exists) | `frontend/app/developer/work.tsx` | — | — | — | — | — | — | `pending` | — | — | — |
| 6 | ProviderInbox | `web/src/pages/ProviderInbox.js` (verify exists) | `frontend/app/inbox.tsx` | — | — | — | — | — | — | `pending` | — | — | — |

`Contract owner` and `Last verified commit` populated when slice moves to `frozen`.

---

## 4. Audit details — slice #1 (ClientDeliverable)

### Web `web/src/pages/ClientDeliverablePage.js` (482 lines)

| # | Violation | Reference | Location | Severity |
|---|---|---|---|---|
| V-1 | Convenience state: `changeSummary` synthesized client-side from `blocks` | I-02 | lines 125–130 | 🔴 |
| V-2 | Forbidden `.filter` in page scope ×3 | I-04 | lines 127, 128, 129 | 🔴 |
| V-3 | Optimistic local mutation after POST approve | I-05 | line 62 | 🔴 |
| V-4 | Optimistic local mutation after POST reject | I-05 | line 81 | 🔴 |
| V-5 | UI derives status (`isPending = status === 'pending'`) — uses **legacy** enum value | I-01, ladder §3 | lines 121–123 | 🟡 |
| V-6 | Error state = `console.error + alert` (not structural render branch) | I-10 | lines 47–48, 66, 86 | 🟡 |
| V-7 | Wrong endpoint family (legacy `/api/deliverables/*`) | I-03 | lines 44, 58, 77 | 🔴 |

### Mobile

| Observation | Reference |
|---|---|
| No dedicated `client/deliverable/[id].tsx` — deliverables shown inline on `projects/[id].tsx` | parity gap (DoD §5) |
| `app/client/projects/[id].tsx` line 182 uses `useMemo(() => deliverables.filter(...))` | violates I-04 in `ClientCabinet` scope (BD-04) |
| `app/chat.tsx`, `frontend/src/decision-hub.tsx` already on canonical family A | aligned |

### Endpoint family resolution (input for slice execution)

- Canonical = `/api/client/deliverables/*` (already used by mobile, chat, decision-hub)
- Legacy `/api/deliverables/*` → bounded debt BD-01

---

## 5. Backend gaps (proposed → must satisfy I-06)

Promotion requires ≥2 independent surfaces proving the same shape.

| ID | Candidate | Surfaces affected | Evidence count | Status | Decision |
|---|---|---|---|---|---|
| G-01 | `change_summary` field on `GET /api/client/deliverables/{id}` | ClientDeliverable web | 1 | NG-01 | **Non-goal until ≥2 surfaces require**. Web currently synthesizes — that synthesis to be removed (carved out from delivery slice; section disappears until backend provides). |
| G-02 | `can_approve` / `can_reject` action-authorization flags | ClientDeliverable web + (future) mobile counterpart | 1 confirmed + 1 pending | NG-02 | **Re-evaluate after mobile screen creation**. If both surfaces converge on same authorization logic, promote. |
| G-03 | Dynamic `next_steps` on DeliverablePage | ClientDeliverable, ClientCabinet | 0 (planned) | NG-03 | **Carved out** to ClientCabinet slice. |

No gap is allowed to migrate from this section to backend code without an
evidence count ≥ 2 **and** a decision entry here recorded before the
backend handler is touched.

---

## 6. Intentional carve-outs

| ID | Item | Owning slice | Reason |
|---|---|---|---|
| C-01 | `useMemo` filter at `frontend/app/client/projects/[id].tsx:182` | ClientCabinet (#3) | Parent surface, not deliverable page itself |
| C-02 | `chat.tsx` inline approve/reject quick-actions | post-Phase 1 | Different surface concept (chat-driven actions) |
| C-03 | Legacy `/api/deliverables/*` family removal | each slice removes own consumers | Family sunsets when last consumer migrates |
| C-04 | Visual status banner chroma in DeliverablePage | atmosphere doctrine | `PERCEPTION_TONE ∉ substrate` |
| C-05 | "What Happens Next" static copy block | atmosphere | Not state-dependent; UX narrative |
| C-06 | Web ESLint TS rules (`DISABLE_ESLINT_PLUGIN=true`) | Phase 2/3 | BD-05 |

---

## 7. Deferred atmosphere decisions

Items intentionally NOT addressed in Phase 1. Recorded here so future passes
do not relitigate "was this missed or deliberate?"

| Item | Rationale |
|---|---|
| Visual status banner color hierarchy | Perception layer, not operational substrate |
| Glow / shadow / token tier additions | Not yet substrate-justified; awaits dedicated perception doctrine |
| Landing copy / hero visuals | Separate art-direction discipline |
| Typography rhythm tuning | Phase 2/3 candidate after state primitives stabilize |
| Iconography unification (lucide-react vs expo/vector-icons) | Cross-platform perception layer |

---

## 8. Follow-up primitives (Phase 2 candidates)

Tagged from each slice for later mechanical extraction. **Empty until at least
one slice is `frozen`** — extraction without evidence produces giant components.

| Primitive candidate | Originating surfaces | Promotion criterion |
|---|---|---|
| _(none yet)_ | _(none)_ | ≥2 frozen surfaces with structurally identical loading/error/empty branch |

---

## 9. Regression anchors

Captured at doctrine freeze. Re-measured at each slice boundary.

| Anchor | Snapshot @ 2026-05-12 | After slice #1 | After slice #2 | … |
|---|---|---|---|---|
| `.reduce` count in `/app/web/src/pages` | _to be snapshotted by Phase 0.5_ | — | — | — |
| `.filter` count in `/app/web/src/pages` | _to be snapshotted by Phase 0.5_ | — | — | — |
| `useMemo` count in `/app/web/src/pages` | _to be snapshotted by Phase 0.5_ | — | — | — |
| Optimistic mutation count (page scope) | _to be snapshotted_ | — | — | — |
| Legacy `/api/deliverables/*` call-site count | 1 (web ClientDeliverablePage) | target 0 | — | — |
| Legacy enum `revision_requested` / `pending` write count | _to be snapshotted_ | — | — | — |
| Convenience state symbol count (I-02 list) | _to be snapshotted_ | should be 0 | — | — |
| Concepts with parity gap (no counterpart screen) | 1 confirmed (Deliverable mobile) | target 0 | — | — |

Phase 0.5 testing walkthrough produces the initial snapshot column.

---

## 10. Testing-against-doctrine probes (for Phase 0.5)

Probes the testing walkthrough must measure. These are **objective**, not
subjective ("clean / not clean"):

| Probe | Expected | Method |
|---|---|---|
| UI computes business state | 0 occurrences in page scope | grep contract §2 |
| Optimistic mutation | 0 occurrences in page scope | grep contract §2 |
| Divergent endpoint family use | 0 new consumers on legacy families | grep + registry diff |
| Independent GET composition | yes per page | code inspection — no merged response objects |
| Loading / error / empty separation | 3 distinct branches per page | code inspection |
| Web ↔ mobile semantic parity | every concept has both surfaces | matrix §3 column "Mobile file" non-empty |
| Legacy enum leakage | bounded (BD-02, BD-03) | grep count = baseline; no new writes |
| Synthetic timeline generation | 0 | grep `[\.\.\.]push` / array spreads on timeline state |
| Vendor name leakage in business logic | 0 (I-08) | grep `stripe_session_id\|wfp_order_ref` outside `integrations/live_adapters.py` |

---

## 11. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-12 | initial | Matrix scaffold; slice #1 (ClientDeliverable) audit row populated; gaps G-01..G-03 deferred to non-goals; carve-outs C-01..C-06 recorded. |
