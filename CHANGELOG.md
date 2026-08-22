# Changelog

All notable changes to OneMoreFloor are documented here, maintained from the first commit onward (Brief §22).
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning will follow the game's release naming (next planned release: **Early Access 0.1**).

## [Unreleased]

### Changed
- **Phase 2 complete (2026-08-22):** the owner answered all open questions (Q1–Q27) and confirmed assumptions A1–A15; every decision is folded into the planning docs and `USER_QUESTIONS.md` is converted into the project's decision ledger. Highlights now fixed in the docs: Gold as the only currency (Q1); one active character (Q2); account-wide Account Upgrades surviving per-slot resets (Q4); charge-and-burst class resources with the approved five-class signature table now in `docs/COMBAT.md` §5 (Q6/Q26); tomes cut from EA 0.1 (Q7, owner-approved deviation from Brief §3.6); same-rewards instant chainable Quick-Raid (Q8); real-time potions and local-midnight/Monday quest resets (Q9/Q10); confirmed hand-authored content volume (Q12); portrait-card combat (Q14); weapon-slot semantics and starting loadouts (Q15); finite sell-to-merchant inventory (Q16); timed merchant restock with Gold reroll (Q17); per-stat potion concurrency (Q18); x2/x4/x8 Battle Speed tiers (Q19); no-pity single-pull gacha on two banners (Q20); 3+3 quest board (Q21); ascension-gated relic/artifact availability (Q22); strictly-upward tower flow (Q23); English-only 0.1 (Q24); fixed hero-naming rules without rename (Q25); FantasyUI-icon item art with id-bound upgrade path (Q27); FantasyUI art licensing cleared commercially (Q13). Phase 3 (explicit approval to start development) remains open.

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
