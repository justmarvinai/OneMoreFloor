# AGENTS.md — how work is structured on OneMoreFloor

Instructions for any AI agent (or human) picking up tasks in this repo. **`CLAUDE.md` is canonical for rules and conventions — read it first; this file adds the task structure.** Requirements source: `docs/GAME_BRIEF.md` (§n).

## Phase gate (mirrors CLAUDE.md — currently binding)

Planning is delivered, every question is answered (`USER_QUESTIONS.md` is the decision ledger — Q1–Q29, none open), the owner approved development on 2026-08-22, and **M0–M10 are built: Early Access 0.1 is complete**. Deploying it is the owner's action (`docs/DEPLOY.md`).

Work from here is reworks, changes and fixes on a finished game rather than milestone order, which changes two things about "done": the save schema now has players' data behind it, so a shape change carries its migration *and* its captured-blob fixture in the same commit (SAVE_SCHEMA §4); and `CHANGELOG.md` has a released `[0.1.0]` section, so new entries go under `[Unreleased]` and released ones are history rather than drafts.

## Work lanes

Work is cut along the module boundaries in `docs/ARCHITECTURE.md` §3 — the lanes below exist so tasks stay parallelizable and reviewable, not as job titles:

| Lane | Owns | Key docs |
|---|---|---|
| **Domain** | `src/domain/` — combat, items, economy, progression, power/brackets; pure logic, headless-testable | COMBAT.md, BALANCE.md |
| **Save** | `src/save/`, migrations, recovery, clock | SAVE_SCHEMA.md |
| **UI** | `src/ui/` — screens, FantasyUI vendoring, choreography, feedback/badges | UI_FANTASYUI_MAP.md |
| **Content** | `src/content/` — data, validators, `assets/` bindings | CONTENT_PIPELINE.md |
| **Balance** | `src/content/balance/` + `tools/` simulator | BALANCE.md |

Cross-lane contracts (store shape, CombatScript, content schemas, bracket function) change only with the interface documented first in the relevant doc — they are the seams that keep lanes independent.

## Task protocol

1. **Slice vertically** — a task delivers a testable behavior ("gear ascension consumes materials and adds a stat slot"), not a layer ("write the item types"). While milestones were open, `ROADMAP.md` order was binding; now that they are all delivered, the ordering constraint is whatever the owner asked for.
2. **Before coding:** read the milestone's exit criteria + the sections of the docs your task cites; check `USER_QUESTIONS.md` — decisions there are binding; if your task hits an ambiguity the ledger doesn't cover, **file a new question and raise it**, don't guess (§0.3).
3. **Definition of done for every task:** behavior implemented per doc; tests for it (domain work = unit tests; save work = fixture tests; UI work = smoke coverage); full verification suite green (`CLAUDE.md` list); `CHANGELOG.md` entry; affected docs updated in the same change; no balance literals outside config; no new dependencies (ARCHITECTURE §2 policy) without prior sign-off.
4. **Review posture:** re-read your diff against the Hard Rules list in `CLAUDE.md` before handing off — those are the defects that are cheap now and brutal in six months.

## Standing sub-agent jobs (patterns that recur)

- **FantasyUI vendoring:** given a screen task, vendor the mapped components (UI map tables) with full `copy` sets from the local `fantasyuis` clone; verify offline rendering.
- **Content authoring:** add enemies/quests/bands through the pipeline only; finish with `content:validate` + a simulator run and report deltas (BALANCE.md §10).
- **Balance tuning:** propose config changes with sim evidence (before/after gate metrics), never raw-number edits with "feels right".
- **Save auditing:** any task touching persisted shapes triggers the migration checklist (SAVE_SCHEMA §4) — schema bump, migration, fixture, torture rerun.
- **§2.1 sweeps (pre-milestone-close):** walk the build hunting stubs, dead ends, missing tooltips, silent `title` attrs, unreachable buttons; file each as a defect.

## Escalation

Ambiguity → `USER_QUESTIONS.md` (§0.3). Scope smell ("the brief doesn't mention X but it seems needed") → propose as a question, never implement (§0.4). Conflict between docs → the brief wins; then file the doc bug.
