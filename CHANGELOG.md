# Changelog

All notable changes to OneMoreFloor are documented here, maintained from the first commit onward (Brief §22).
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning will follow the game's release naming (next planned release: **Early Access 0.1**).

## [Unreleased]

### Added
- **Phase 1 planning package** (no game code — per Brief §22 the planning phase precedes all development):
  - `docs/GAME_BRIEF.md` — the owner's v2 brief, archived verbatim as the requirements source of truth.
  - `USER_QUESTIONS.md` — the twelve known contradictions from Brief §23 (Q1–Q12) plus fifteen questions found during planning (Q13–Q27), each with options and a recommendation, and fifteen working assumptions (A1–A15).
  - `ROADMAP.md` — phase gates and milestones M0–M10 with exit criteria, sized and dependency-ordered to a shippable EA 0.1.
  - `docs/ARCHITECTURE.md` — tech stack decision with written justification (Vite + strict TypeScript + vanilla DOM with vendored FantasyUI; DOM/WAAPI combat rendering; seeded deterministic RNG; `idb`-wrapped IndexedDB), module layout, cross-cutting policies, Electron forward-compatibility checklist.
  - `docs/SAVE_SCHEMA.md` — IndexedDB save design: schema versioning + migration registry, checksummed generational backups and corruption recovery, clock-tamper damping, session lock, export/import posture.
  - `docs/BALANCE.md` — formula shapes and curve families, Power Level formula, the bracket system implementing Brief §13's anti-overshoot rule, drop/gacha/economy design, balance-simulator plan.
  - `docs/COMBAT.md` — combat specification: resolve-then-perform engine, CombatScript contract, turn model, buff/debuff model, presentation/choreography spec for x1–x8.
  - `docs/UI_FANTASYUI_MAP.md` — full screen inventory mapped to verified FantasyUI components, custom-component allowlist, item-rendering standard, resolution strategy.
  - `docs/CONTENT_PIPELINE.md` — data-driven content architecture for classes, enemies, floors, items, quests and tutorial, with validation and authoring workflows.
  - `CLAUDE.md` / `AGENTS.md` — working instructions, hard rules from the brief, conventions, and task structure for this repo.
