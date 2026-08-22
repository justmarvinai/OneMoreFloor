# OneMoreFloor — Roadmap to Early Access 0.1

> Status: **Phase 1 (planning) delivered — development NOT started.** Per Brief §22: Phase 2 = you answer `USER_QUESTIONS.md`; Phase 3 = you explicitly approve development. Only then does M0 begin. Brief cited as §n (see `docs/GAME_BRIEF.md`).

**The bar for "shipped":** §2.1 verbatim — every feature in §3–§21 fully implemented, balanced, animated, reachable; no placeholders, no stub screens, no dead ends over many hours of play. Every milestone below carries exit criteria; M10 re-audits the whole game against §2.1 feature by feature.

Sizing: S / M / L / XL (relative effort, not dates — dates would be fiction before Phase 2 answers land).

---

## Phase gates (now)

- [x] **P1 — Planning package** (this repo state): brief archived, questions filed, architecture/save/balance/combat/UI/content docs written.
- [ ] **P2 — Questions answered** — every item in `USER_QUESTIONS.md`; answers folded back into the docs (each doc's `⧗Qn` markers resolved).
- [ ] **P3 — Development approval** — your explicit go. **Nothing below starts before this.**

---

## M0 — Foundation & walking skeleton (M)

Repo scaffolding: Vite + strict TS, ESLint/Prettier with the custom rules (import boundaries, `Date.now()` ban, `title`-attribute ban — ARCHITECTURE §5/§7), Vitest + Playwright wiring, CI pipeline (ARCHITECTURE §7), Vercel project (static). Vendor FantasyUI (components used first + art packs, `setAssetBase('/fui')` — ARCHITECTURE §2). Store, router, `time.ts`, seeded RNG streams. A walking skeleton boots: title gate → empty shell with sidebar in `stone-vine`, one placeholder screen, save layer round-trips a trivial record.
**Exit:** CI green on all checks; skeleton deploys to Vercel; FantasyUI renders offline (no CDN calls — verified by a network-blocked Playwright run).

## M1 — Save layer & character lifecycle (M)

Full SAVE_SCHEMA implementation: stores, checksums, generations/backups, recovery ladder, migration registry + fixture harness, session lock, tamper-damped clock. Account record; hero creation (name rules ⧗Q25, class pick with real class data §5/§8); character select (⧗Q2); reset flow (⧗Q4, §19); account-slot gating (§15.2, purchase UI can stub prices until M6).
**Exit:** SAVE_SCHEMA §11 test plan green (round-trip, tamper, recovery, rollback scenarios); create → play-stub → switch → reset cycle works; a corrupted store recovers with the styled panel, not a crash.

## M2 — Item & stat domain, Power Level, brackets (L)

Stats model (§6, Speed gear-only enforced by type), item generation (base types × rarity × affixes per CONTENT_PIPELINE §2), equip rules (§8.1/§8.2/⧗Q15), gear leveling + gear ascension (§10, ⧗Q3), materials, gold stat upgrades (A2), XP/levels/hero ascension (§7). Power Level formula + `bracketOf` + **the anti-overshoot property test** (BALANCE.md §5–6) — CI-permanent from this milestone on.
**Exit:** headless: generate/equip/upgrade/ascend across the full range with invariants green; bracket sweep test green; hero ascends 0→5 with caps/slot unlocks per §7 table.

## M3 — Combat engine & floor generation (L)

Combat resolution → CombatScript (COMBAT.md §1–6): rounds, Speed double-attacks, Luck crits, variance, buff/debuff model, boss kits, class resources + signature moves (⧗Q6/Q26), endless-guard. Floor generator (bands, every-10th-boss §3.1, seeded stability — CONTENT_PIPELINE §2), reward rolls through brackets (§3.6), death consequence + Quick-Raid resolution (§3.3/§3.4/⧗Q8) — all headless.
**Exit:** deterministic-replay property test (same seed ⇒ identical script/outcome/loot, watched or skipped); scripted fixture fights prove every stat/effect does its job; first balance-sim smoke runs end-to-end (BALANCE.md §10 harness exists).

## M4 — Tower & combat presentation (XL)

The game becomes visible and playable: tower screen (`StageTrail` treatment, floor preview, one-more-floor button, Quick-Raid UI — UI_FANTASYUI_MAP §2), **combat screen with the full choreography vocabulary** (COMBAT.md §7) including signature set-pieces, x1–x8 playback (§3.5), skip; death screen + reset flow (§3.3, COMBAT.md §8); loot/result windows.
**Exit:** COMBAT.md §9 acceptance criteria, including the 60 fps @2K budget and the "legible at x8" review; climb → die → reset → quick-raid loop plays end-to-end with real drops.

## M5 — Character screen, inventory, merchants (L)

Character screen per reference (UI_FANTASYUI_MAP §4): paperdoll + locked ascension slots, stat rows with gold upgrades, PL display, ascension-stars, gear detail (level/ascend with materials), potion buffs. Inventory (⧗Q16: capacity + sell/disposal). Both merchants (§11/§12): bracketed stock, restock/reroll (⧗Q17), potions (⧗Q18), buy/sell.
**Exit:** every §6/§10 progression action doable through UI with full tooltips (§20.4) and red-dot truth (§20.5); merchant stock provably bracket-bound; buy→equip→stronger-fight loop closes.

## M6 — Quests, tutorial, account upgrades (M)

Daily/weekly engine + board UI (§17, ⧗Q10/Q21) incl. hard-quest ticket rewards; tutorial sequence + skip-nudge + completion reward (§18, A10); account upgrades screen with real prices (§15, ⧗Q19); badge service wired game-wide (§20.5).
**Exit:** fresh profile: tutorial → first claims all guided; quest periods reset correctly across clock scenarios (tamper tests); both upgrades purchasable end-to-end (cheat-funded for testing).

## M7 — Gacha (M, +set-piece budget)

Pull resolution through brackets (§16.2, ⧗Q20), banner lobby with honest `RateTable`, ticket faucets wired (§16.1). Then the **§16.3 reveal set-piece** — anticipation build, fake-outs, rarity-escalating light/particle language — built and iterated as its own deliverable (UI_FANTASYUI_MAP §6), reviewed against "feels like a real event", not "transition exists".
**Exit:** odds conform to config over large simulated pulls; bracket property holds from gacha too; the reveal at every rarity tier passes your review (§16.3 is explicitly a taste gate — you sign it off).

## M8 — Content fill to EA volume (L)

Author the Q12-agreed volume: enemy families + bosses with effect kits across the hand-authored range, band themes, procedural modifiers beyond it; quest template pool; polish pass on floor pacing floors 1–30 (first-session quality). Demonstrate the CONTENT_PIPELINE §4 workflow (throwaway enemy + quest added end-to-end in review).
**Exit:** `content:validate` green; floors 1–5000 generate sane (automated sweep: stats monotone, no missing refs); every enemy renders (silhouette fallback confirmed working per §4.3).

## M9 — Balance (L)

Simulator-driven tuning across archetypes to BALANCE.md §10's gates: death-wall placement, re-climb-in-minutes, class parity band, gold always-slightly-short (§14), gear 1–10 cheap / 11–15 push (§10.1), rarity arc (§9.2), ticket cadence (§8 of BALANCE.md). Manual playtests at 1080p/2K bracketing the sim.
**Exit:** all sim gates green with the tuned config committed + documented; a full manual first-session playtest (you + me) signs off the feel.

## M10 — Hardening & ship (M)

§2.1 audit: walk §3–§21 feature-by-feature against the build; kill every dead end/stub. Save-torture (fault-injection, SAVE_SCHEMA §11), perf pass, cross-browser (A9 set), fresh-profile + long-profile regression, Playwright suite complete (ARCHITECTURE §7), CHANGELOG for 0.1, deploy checklist, Electron-forward smoke (relative paths / offline run — ARCHITECTURE §6).
**Exit:** EA 0.1 live on Vercel; the §2.1 sentence is true and demonstrated: hours of play, something always claimable, no unimplemented button anywhere.

---

## Standing tracks (every milestone)

CHANGELOG.md updated with every merge (§22); balance values only ever in config (§3.7); new content only through the pipeline (§2.3); docs updated when answers/decisions land (the `⧗Qn` markers are the to-do list for that); USER_QUESTIONS.md grows the moment any new ambiguity appears (§0.3) — it never blocks silently.

## Dependency notes

M2→M3→M4 is the critical path (domain before engine before presentation). M5 needs M2; M6/M7 need M1+M2 and slot flexibly; M8 can start authoring after M3 stabilizes schemas and overlaps M4–M7; M9 needs everything feature-complete; M10 last. If Q7 (tomes) or Q26 (class mechanics) answers expand scope, M3/M6 re-size and this file gets a revision entry.
