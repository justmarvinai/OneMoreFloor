# OneMoreFloor — Technical Architecture (EA 0.1)

> Status: **planning — all feeding questions resolved (see `USER_QUESTIONS.md` ledger); awaiting Phase 3 development approval** (Brief §22). No game code exists yet; this document is the blueprint it will be built from. Requirements are cited from `docs/GAME_BRIEF.md` as §n, decisions as Qn.

## 1. Constraints this architecture serves

From the brief: browser game hosted on Vercel with **no backend, no server logic, no database, no accounts** (§21); all player data in **IndexedDB**; save layer designed from day one for schema versioning, migrations, and corruption recovery (§21); **richly animated** combat that must feel good at x1 and x8 (§4.1); UI built on **FantasyUI** and looking like a game, not a web app (§20); **data-driven content** so classes/enemies/floors/items can grow without touching logic (§2.3); a later **Electron/Steam** wrap that must not be painted out (§2.3, §21); **no audio** (§2.2); desktop-first at 1080p/2K (§20.6); boring, maintainable choices over clever ones (§0.5).

## 2. Tech stack (the decision and why)

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | FantasyUI is built for it ("drops into any Vite project"); instant dev server; static `dist/` output deploys to Vercel and later loads unchanged in Electron via `file://`-safe relative paths. |
| Language | **TypeScript, `strict`** | Long-term maintainability (§0.1); typed content schemas are the backbone of the data-driven requirement; FantasyUI is TypeScript. |
| UI runtime | **Vanilla DOM + vendored FantasyUI components. No framework (no React/Vue/Svelte).** | The single most consequential choice — justification below. |
| Combat/FX rendering | **DOM + CSS transforms + Web Animations API (WAAPI)** | Portrait-card combat (Brief §4.1's reference gif) is card choreography, floating numbers and overlay effects — exactly what the DOM does well and what FantasyUI (`FloatingText`, `ImpactFrame`, `DamageVignette`, `BuffBar`, `UnitFrame`) already provides. WAAPI gives timeline control (pause, rate, seek) which makes Battle Speed x1–x8 a *playback-rate* change (§3.5) instead of re-authored animations. No Phaser/Pixi in 0.1: an engine would sit beside FantasyUI's DOM as a second rendering world with double the styling, hit-testing and z-order rules — against §0.5. |
| State | **Hand-rolled typed store (~200 lines): single state tree, pure mutation functions, event emission per domain slice** | The game is turn/event-based, not per-frame simulation; a redux-like micro-store is boring and debuggable. UI components subscribe to slices and patch themselves imperatively (FantasyUI components are imperative class instances — a natural fit, no virtual-DOM impedance). |
| Persistence | **IndexedDB via [`idb`](https://github.com/jakearchibald/idb) (~1 KB promise wrapper)** | Raw IndexedDB's event API is a known source of subtle bugs; `idb` is the boring, standard-issue fix, tiny and dependency-free. Full save design in `docs/SAVE_SCHEMA.md`. |
| RNG | **Seeded deterministic PRNG (mulberry32 family), never `Math.random()` in game logic** | Deterministic combat and drops make fights replayable (skip = resolve with same seed), balance simulable headlessly, and bugs reproducible. Seeds are stored per run in the save. |
| Tests | **Vitest** (sim/logic/migrations) + **Playwright** (screen smoke tests; Chromium) | Combat resolution, balance curves, Power-Level bracketing (§13's anti-overshoot rule) and save migrations are pure functions — perfect unit-test targets. The balance simulator (see `docs/BALANCE.md` §10) runs on Vitest infrastructure. |
| Lint/format | **ESLint + Prettier**, CI-enforced | Convention over discussion (§0.5). |
| Hosting | **Vercel, fully static output** | §21. No serverless functions, ever — a function would be a backend. |

**Runtime dependency policy:** production dependencies are limited to `idb` and vendored FantasyUI code. Everything else must be argued into `CLAUDE.md`'s allowlist first. Few dependencies = a codebase still healthy in six months (§0.1) and a trivial Electron audit later.

### Why no framework

1. **FantasyUI is the design system and it is imperative vanilla TS.** Components are class instances (`new Panel({...})`) with native-CustomEvent channels and `destroy()` lifecycles, explicitly designed to run without adapters. Wrapping 40+ such components in React refs/effects adds a permanent translation layer, two lifecycle models, and two mental models — clever, not boring.
2. **The UI is a game shell, not a document.** Screens are long-lived, imperatively choreographed (combat timelines, gacha reveals §16.3), and mostly update via targeted patches (a bar fills, a badge increments). A virtual-DOM diff loop buys nothing here.
3. **Electron & Vercel indifference.** Plain Vite + DOM output is equally happy on a static host or in a `BrowserWindow`.

The cost is discipline instead of guardrails (framework conventions). We buy that discipline back with a small set of hard rules (screen lifecycle contract below, store subscription pattern, ESLint) written into `CLAUDE.md`.

### FantasyUI consumption

Per FantasyUI's own README: **vendor the component source** (each component's `/r/<Component>.json` record lists its `copy` set incl. dependencies) into `src/ui/fui/` preserving the `core/` + `components/` sibling layout; copy the art packs (`public/fui/…`) into our `public/fui/`; call `setAssetBase('/fui')` at boot. **No CDN references at runtime** — the game must be fully self-contained for offline/Electron (§2.3). Theme usage: `stone-vine` for hub/character/merchant screens, `dark-ember` for tower/combat/death (the library's intended split; matches the reference art's tonal shift). Vendored files are treated as third-party: bug fixes go upstream to the FantasyUIs repo, then re-vendor; we never fork component internals silently. Licensing is on the record (Q13): the owner confirmed all FantasyUI art packs are cleared for commercial use in OneMoreFloor, web and Steam alike. Custom components (only where §20.2 permits) live in `src/ui/custom/`, are built from FantasyUI tokens/semantic slots, and are listed in `docs/UI_FANTASYUI_MAP.md`.

> Remote-dev note: the FantasyUI demo domain is not reachable from the sandboxed dev environment (egress-blocked), but `git clone https://github.com/justmarvinai/fantasyuis` works and contains everything (components, art, catalog). Vendoring is done from a local clone.

## 3. Module layout (planned)

```
src/
  main.ts                 # boot: load save → construct shell → route to screen
  app/
    store.ts              # typed state tree + subscribe/patch
    router.ts             # screen switching, transition hooks
    time.ts               # clock service: now(), tamper damping (SAVE_SCHEMA §7)
    rng.ts                # seeded PRNG streams (combat / loot / merchant / gacha)
  domain/                 # pure game logic — NO DOM imports (lint-enforced)
    combat/               # resolution engine + combat log event model (COMBAT.md)
    economy/              # gold, materials, costs, merchant stock rolls
    items/                # item generation, affixes, equip rules, gear upgrade/ascension
    power/                # Power Level formula + bracket function (BALANCE.md §5–6)
    progression/          # XP, levels, hero ascension, tower state, quick-raid
    quests/               # daily/weekly engine
    gacha/                # pull resolution (animation lives in ui/)
  content/                # DATA ONLY — the data-driven layer (CONTENT_PIPELINE.md)
    balance/              # the single tunable balance config (§3.7) — curves, tables
    classes/  enemies/  floors/  items/  quests/  tutorial/
  save/                   # IndexedDB layer, schema versions, migrations, recovery
  ui/
    fui/                  # vendored FantasyUI (core/ + components/) — third-party
    custom/               # our FantasyUI-language components (few; inventoried)
    screens/              # one module per screen (shell, tower, combat, character, …)
    feedback/             # red-dot/badge service, toasts, reward popups (§20.5)
  strings/                # all player-facing text (Q24: i18n-ready from day one)
public/fui/               # vendored FantasyUI art packs
assets/                   # game art (class avatars, later enemy avatars, examples)
tools/                    # balance simulator CLI, content validators (run via Vitest/tsx)
```

**The load-bearing rule:** `domain/` and `content/` never import from `ui/` or `save/`; `ui/` never mutates state except through store actions; content is data, logic is generic over it (§2.3). ESLint import-boundary rules enforce this mechanically.

## 4. Runtime shape

- **Boot:** open IndexedDB → run pending migrations → load account + active character (or Character Select / Hero Creation if none) → mount shell → enter last screen.
- **Game loop:** there is none in the per-frame sense. The game is **event-driven**: user actions dispatch store actions; combat is resolved instantly as a pure function producing an **event script** (see `docs/COMBAT.md` §6) which the combat screen then *performs* over time via WAAPI; timers (potions, quest resets, merchant restock) are wall-clock checks on a coarse 1 s tick plus on-focus recompute.
- **Saving:** autosave on every meaningful state transition (fight resolved, purchase, equip, level-up), debounced; plus on `visibilitychange`/`pagehide`. Details and integrity strategy in `docs/SAVE_SCHEMA.md` §5–6.
- **Performance budget:** 60 fps during combat choreography at 2560×1440 on a MacBook Air (§20.6). Compositor-friendly animation only (transform/opacity/filter); no layout-thrashing properties in animation paths; particle counts capped by config. Screens are constructed on entry and `destroy()`ed on exit (FantasyUI's lifecycle contract) — no leaked timers/listeners (its own audit tooling models this discipline; we adopt it).

## 5. Cross-cutting policies

- **Determinism:** every random decision draws from a named seeded stream (`combat:{runId}:{floor}`, `loot:{…}`, `merchant:{restockId}`, `gacha:{pullId}`). Re-resolving with the same seed gives the same result — the foundation for Quick-Raid instant resolution (§3.4), replayable bug reports, and the balance simulator.
- **Time:** a single `time.ts` service owns wall-clock reads + tamper damping rules (SAVE_SCHEMA §7). Game logic never calls `Date.now()` directly (lint rule) — that keeps Q9/Q10 policies swappable and testable.
- **Errors:** a crash during a state transition must never corrupt the save — write-ahead pattern in SAVE_SCHEMA §6. UI errors surface as an in-game-styled error panel (never a bare white screen), with a "copy diagnostic" affordance (later feeds export/import support tooling).
- **No-list:** no analytics/telemetry (nothing phones home — §21's spirit), no service worker in 0.1 (cache invalidation risk without a versioning story; revisit for Electron), no Web Workers until the balance simulator or floor generation measurably needs one, **no audio** (§2.2), no native browser `title` tooltips anywhere (§20.4 — FantasyUI `Tooltip` only, enforced by lint/audit).

## 6. Electron forward-compatibility checklist (§2.3 — anticipate, don't build)

What we do *now* so the later wrap is a packaging task, not a port: relative asset paths only (Vite `base: './'`); no server-side anything; no third-party network calls at runtime (fonts, art and FantasyUI all vendored — the game runs with the network cable pulled); IndexedDB persistence works unchanged in Chromium; keyboard/mouse-first input (§20.6); window-size assumptions match §20.6 targets and are testable in a fixed-size `BrowserWindow`. What we explicitly do **not** do now: no Electron builds, auto-update, Steam SDK, or save-path abstraction beyond the existing save layer seam (§21 "later — not now").

## 7. Verification plan (what CI runs once code exists)

`typecheck` → `lint` (incl. import boundaries, no-`Date.now()`, no-`title`-attr rules) → `test` (domain units, migration fixtures, balance invariants incl. the §13 anti-overshoot property test) → `content:validate` (schema-check all content/balance data) → `build` → Playwright smoke (boot to hero creation, create hero, clear floor 1, open every screen, die, verify reset per §3.3). The anti-overshoot property test is non-negotiable: for a sweep of character states, **no source (drop/merchant/gacha) may ever emit an item outside the state's bracket** (§13).

## 7a. As-built notes from M0

The stack above is now standing; these are the decisions that only surfaced once it was:

- **Versions in play:** Vite 8, TypeScript 6, Vitest 4, ESLint 10 (flat config) + typescript-eslint 8, Prettier 3, Playwright 1.62, `idb` 8. Production dependencies remain exactly one (`idb`) plus vendored FantasyUI.
- **`noUncheckedIndexedAccess` is off**, matching the setting FantasyUI is authored against. Vendored components compile as part of our program (TypeScript has no per-directory flags, and their `.ts`-extension imports rule out a project-reference boundary), so the alternative was editing vendored source — the silent fork CLAUDE.md forbids. Every other strict flag is on; indexing safety in our own code rides on explicit fallbacks and tests.
- **Asset paths came out better than planned.** With `base: './'`, Vite rewrites FantasyUI's `/fui/...` art URLs to `../fui/...` relative to the emitted stylesheet, so the built game is location-independent — no re-pointing step needed for the later Electron wrap.
- **Vendoring is a script, not a ritual:** `tools/vendor-fui.mjs` reads `fui.components.json`, closes the component dependency graph by following `./X.ts` imports, copies `core/` + `components/` + theme styles, regenerates the barrel and a stylesheet covering exactly what was vendored, and copies the art packs. The vendored output is committed, so CI and Vercel build without needing the FantasyUI clone.
- **Playwright browser resolution:** the config uses an already-installed Chromium when one is present (`PLAYWRIGHT_CHROMIUM_PATH`, default `/opt/pw-browsers/chromium`) and otherwise falls back to Playwright's managed browser, so the same config works in the dev container and in CI.
- **Lint rules that encode the brief** are live: native `title` in all three shapes it could reach the DOM, `Math.random()`/`Date.now()`/`new Date()` outside `app/rng.ts` and `app/time.ts`, and the `domain`/`content` → `ui`/`save` import boundary.

## 8. Resolution log

Everything that fed this document is resolved (2026-08-22, `USER_QUESTIONS.md` ledger): the A1 stack posture stands ratified with the plan answers; Q14 confirmed portrait-card combat, so DOM/WAAPI is sufficient and the no-engine call is final for 0.1; Q24 fixed English-only 0.1 on the i18n-ready strings module; Q13 cleared FantasyUI art commercially. The one remaining gate is Phase 3 approval, after which M0 begins.
