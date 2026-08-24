# CLAUDE.md — OneMoreFloor working instructions

OneMoreFloor is a single-player Fantasy-RPG roguelike tower-climber for the browser (Shakes-and-Fidget feel × endless tower), built as a **long-term commercial game**. Act like a senior engineer on it: every decision defensible in six months; boring beats clever.

## ✅ Phase gates — all passed

Planning delivered, every question answered through **Q45** (`USER_QUESTIONS.md` is the decision ledger, and it has no open questions), and **development approved by the owner on 2026-08-22**. **M0–M10 are complete** (foundation, save layer, item domain, combat, presentation, economy, quests/tutorial/upgrades, gacha, content fill, balance, hardening) — **Early Access 0.1 is built**, and the one thing left in `ROADMAP.md` is the owner deploying it (`docs/DEPLOY.md`).

Six polish rounds have landed since. The fifth added curses, salvage, reforge,
presets, the bestiary, run history, milestones, auto-climb and a gacha wish list
(Q30–Q35); the sixth added echoes, sets and named uniques, talents, expeditions,
the workbench, elites, branching paths, deeds, the boss rush and companions
(Q36–Q45). Every one of them is recorded in the ledger with the rule that kept
it inside §13.

Work after this point is reworks, changes and fixes on a shipped game, not milestone order. Two things change what "done" means: the save schema now has players' data behind it (a shape change needs its migration *and* its captured-blob fixture in the same commit — SAVE_SCHEMA §4), and `CHANGELOG.md` has a released `[0.1.0]` section, so new work goes under `[Unreleased]` and released entries are history, not drafts.

## Source of truth & docs index

Requirements live in **`docs/GAME_BRIEF.md`** (the owner's brief, verbatim — cited everywhere as §n). If a requirement is ambiguous, contradictory or missing: **do not invent an answer silently** — add a question to `USER_QUESTIONS.md` and ask (Brief §0.3). Do not add features beyond the brief; propose them as questions instead (§0.4).

| Doc | Contents |
|---|---|
| `ROADMAP.md` | Phase gates, milestones M0–M10, exit criteria |
| `USER_QUESTIONS.md` | Decision ledger (Q1–Q29 resolved, A1–A15 confirmed) + where new questions get filed |
| `docs/ARCHITECTURE.md` | Stack + justification, module layout, policies, Electron forward-compat |
| `docs/SAVE_SCHEMA.md` | IndexedDB design, versioning/migrations, recovery, clock tamper rules |
| `docs/BALANCE.md` | Formula shapes, Power Level, brackets/anti-overshoot, simulator |
| `docs/COMBAT.md` | Resolution engine, CombatScript, presentation spec |
| `docs/UI_FANTASYUI_MAP.md` | Screen×component inventory, custom-component allowlist |
| `docs/CONTENT_PIPELINE.md` | Data-driven content: types, ids, validation, workflows |
| `docs/EA_0.1_AUDIT.md` | The §2.1 audit: every requirement, where it lives, and the test that proves it |
| `docs/DEPLOY.md` | The owner's deploy checklist — before, after, and rolling back |
| `docs/CREDITS.md` | Third-party assets, their licences, and what each asks for in return |

## Hard rules (from the brief — violating any is a defect)

- **Scope nevers (§2.2):** no audio of any kind; no backend/server/database/accounts/login; no multiplayer/social/PvP ever (§1); no monetization/ads; no mobile UI in 0.1; no Electron packaging yet; exactly two account upgrades (§15); exactly five classes (§8).
- **No placeholders shipped (§2.1):** EA 0.1 means finished — no stubs, no `TODO: balance later`, no unreachable/unimplemented buttons.
- **Speed stat comes only from gear** — never level-ups, never purchasable (§6). Encode this in types, not comments.
- **Death destroys nothing owned** (§3.3): only tower-run progress resets; highest-floor record persists (§3.4).
- **Anti-overshoot (§13):** every item source (drops/merchants/gacha) emits only inside the character's Power-Level bracket — guarded by a permanent CI property test (BALANCE.md §6).
- **Native `title` tooltips are forbidden** anywhere (§20.4) — FantasyUI `Tooltip` only. Enforced twice: a lint rule over our source, and `src/ui/tooltips.ts` adopting at runtime the `title`s vendored components emit (UI_FANTASYUI_MAP §12). A smoke test asserts the document never contains one.
- **Balance numbers live only in `src/content/balance/`** (§3.7) — a literal tunable in `src/domain/` is a review-blocking bug.
- **Content is data** (§2.3): classes/enemies/floors/items/quests/tutorial in `src/content/` per `docs/CONTENT_PIPELINE.md`; logic never hardcodes content. Enemy avatars bind by id with `silhouette-warrior-m` fallback (§4.3). Art ids are validated against the CSS that declares them, and painted-icon slots reject `glyph-*` ids (those are masks, not pictures).
- **UI is FantasyUI** (§20.2): vendored components first; custom components only via the allowlist in `docs/UI_FANTASYUI_MAP.md` §10, built in FantasyUI's design language. The game must feel like a game, never a web app (§20.1).

## Engineering conventions (once code exists)

- TypeScript `strict`; no `any` without a comment naming the reason.
- Import boundaries (lint-enforced): `domain/`+`content/` never import `ui/`/`save/`; UI mutates state only through store actions (ARCHITECTURE §3).
- No `Math.random()`/`Date.now()` in game logic — seeded RNG streams (`app/rng.ts`) and the clock service (`app/time.ts`) only.
- Every save-shape change bumps `CURRENT_SCHEMA_VERSION` and ships its migration + captured-blob fixture test **in the same commit** (SAVE_SCHEMA §4).
- Combat/gacha/merchant randomness resolves through named seed streams so outcomes are replayable (ARCHITECTURE §5).
- All player-facing text goes through `src/strings/` (Q24: English-only 0.1, i18n-ready from day one) — no literals in logic/content.
- Screens follow FantasyUI's lifecycle: construct on enter, `destroy()` on exit; leaked listeners/timers are defects. **Whoever holds a screen destroys it** — pass the screen, never its `.el` (ARCHITECTURE §4); the shortcut compiles and leaks every screen the player leaves.
- Verification (run **all** of these before declaring work done): `npm run typecheck · lint · format:check · test · content:validate · sim · build · smoke`. CI runs the same list in the same order. Balance/content changes also rerun the simulator once it exists (BALANCE.md §10).
- Third-party art is **vendored, never fetched** (§21) and recorded in `docs/CREDITS.md` with its licence. The paperdoll's slot icons come from Open Game Icons (CC BY 3.0) via `npm run vendor:slot-icons`, which strips each source file's backdrop and emits masks plus the stylesheet that binds them — run it, commit its output, never hand-edit `src/styles/slots.css`.
- Adding a FantasyUI component: add its name to `fui.components.json`, run `npm run vendor:fui` (needs a local `fantasyuis` clone; `FUI_SRC` overrides the path), commit the vendored output. Dependencies resolve automatically; never hand-copy.

## Process

- **CHANGELOG.md is maintained from every commit onward** (§22): every user-visible or structural change lands with an entry under `[Unreleased]`.
- Commits: imperative subject, body explains *why*; reference the milestone (`M4:`) once development starts. Never commit commented-out code or dead files.
- When a new ambiguity/contradiction surfaces mid-work: file it in `USER_QUESTIONS.md`, mark affected code/doc with `⧗Qn`, continue on the documented assumption only if one exists — otherwise stop and ask.
- FantasyUI workflow: vendor from a local clone of `justmarvinai/fantasyuis` (see `docs/ARCHITECTURE.md` §2 — the demo site is egress-blocked in the remote dev environment; the GitHub clone works). Copy each component's full `copy` set (its `/r/<Component>.json` record or repo source) preserving `core/` + `components/` sibling layout; fixes go upstream, never silent forks.

## Environment notes (Claude Code remote)

`gh` CLI is unavailable — use the GitHub MCP tools. Assets in `assets/` are large binaries; don't re-read them wholesale without need (extract gif frames via Pillow — pattern in FantasyUIs' CLAUDE.md). The visual references in `assets/examples/` are the look-and-feel target (§20.3): study them before building any screen.
