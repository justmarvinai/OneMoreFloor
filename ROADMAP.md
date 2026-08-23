# OneMoreFloor — Roadmap to Early Access 0.1

> Status: **Early Access 0.1 is built.** All questions answered and folded in (Q1–Q29; the ledger has none open), the owner approved development on 2026-08-22, and **M0–M10 are delivered**. What remains is the owner's own action: deploying it, per `docs/DEPLOY.md`. Brief cited as §n (see `docs/GAME_BRIEF.md`); decisions cited as Qn (see `USER_QUESTIONS.md`).

**The bar for "shipped":** §2.1 verbatim — every feature in §3–§21 fully implemented, balanced, animated, reachable; no placeholders, no stub screens, no dead ends over many hours of play. Every milestone below carries exit criteria; M10 re-audits the whole game against §2.1 feature by feature.

Sizing: S / M / L / XL (relative effort, not dates — dates would be fiction before Phase 2 answers land).

---

## Phase gates (now)

- [x] **P1 — Planning package** (this repo state): brief archived, questions filed, architecture/save/balance/combat/UI/content docs written.
- [x] **P2 — Questions answered** (2026-08-22): all of Q1–Q27 answered; decisions folded back into the docs and recorded in the `USER_QUESTIONS.md` ledger.
- [x] **P3 — Development approval** (2026-08-22): granted.

---

## M0 — Foundation & walking skeleton (M) — ✅ delivered 2026-08-22

Repo scaffolding: Vite + strict TS, ESLint/Prettier with the custom rules (import boundaries, `Date.now()` ban, `title`-attribute ban — ARCHITECTURE §5/§7), Vitest + Playwright wiring, CI pipeline (ARCHITECTURE §7), Vercel project (static). Vendor FantasyUI (components used first + art packs, `setAssetBase('/fui')` — ARCHITECTURE §2). Store, router, `time.ts`, seeded RNG streams. A walking skeleton boots: title gate → empty shell with sidebar in `stone-vine`, one placeholder screen, save layer round-trips a trivial record.
**Exit:** CI green on all checks; skeleton deploys to Vercel; FantasyUI renders offline (no CDN calls — verified by a network-blocked Playwright run).

**Delivered:** all of the above, with 64 unit tests and 7 Playwright smoke tests green. The offline guarantee is stronger than planned — Vite rewrites FantasyUI's art URLs to fully relative paths at build time, so the packaged game needs no re-pointing step for Electron later. A repeatable `npm run vendor:fui` resolves component dependencies and regenerates the barrel/stylesheet, so growing the UI is a one-line manifest edit. Vercel deployment itself is the owner's to trigger (repo → project link); `vercel.json` is committed and the static build is verified locally.

## M1 — Save layer & character lifecycle (M) — ✅ delivered 2026-08-22

Full SAVE_SCHEMA implementation: stores, checksums, generations/backups, recovery ladder, migration registry + fixture harness, session lock, tamper-damped clock. Account record; hero creation (Q25 name rules, class pick with real class data §5/§8, Q15 starting loadouts); character select (Q2: the single switching point); reset flow (Q4: wipes one slot, account upgrades survive; §19); account-slot gating (§15.2, purchase UI can stub prices until M6).
**Exit:** SAVE_SCHEMA §11 test plan green (round-trip, tamper, recovery, rollback scenarios); create → play-stub → switch → reset cycle works; a corrupted store recovers with the styled panel, not a crash.

**Delivered:** all of the above, verified by 168 unit tests and 11 Playwright smoke tests covering the whole cycle in a browser. Two things came out stronger than planned: a record's *first* write now seeds its own backup (a test showed a character corrupted right after creation was otherwise unrecoverable), and the five classes are authored as real content with the approved Q26 identities, so hero creation shows each class's resource, signature move and weapon rule rather than a name and a picture.

**Re-sequenced:** starting equipment (Brief §5, Q15) moves to M2. Class content declares each class's weapon rule, but instantiating a starting weapon needs the item system; building a throwaway version of it here would have meant building it twice. The class definitions are ready for it.

## M2 — Item & stat domain, Power Level, brackets (L) — ✅ delivered 2026-08-22

Starting equipment per class (§5, Q15 — carried over from M1). Stats model (§6, Speed gear-only enforced by type — the `UpgradableStatId` type landed in M1), item generation (base types × rarity × affixes per CONTENT_PIPELINE §2, incl. Q5 accessory pools and Q27 icon binding), equip rules (§8.1/§8.2; Q15 weapon-slot semantics), gear leveling + gear ascension (§10; Q3 slot cadence), materials, gold stat upgrades (A2), XP/levels/hero ascension (§7). Power Level formula + `bracketOf` + **the anti-overshoot property test** (BALANCE.md §5–6) — CI-permanent from this milestone on.
**Exit:** headless: generate/equip/upgrade/ascend across the full range with invariants green; bracket sweep test green; hero ascends 0→5 with caps/slot unlocks per §7 table.

**Delivered:** all of the above, with 283 unit tests. The anti-overshoot guard sweeps ~13,000 generated items per run across every bracket, base type and rarity, and it asserts what an item *actually gives* rather than the budget it rolled — a distinction that turned out to matter, since integer rounding could push a realised item past its window. Starting equipment (carried over from M1) is in: every class begins holding exactly its class weapon and nothing else (§5), rolled through the ordinary generator rather than as a special case.

**Schema v2:** characters gained equipment, inventory, currencies and materials. The migration arms v1 heroes — who predate the item system — with their class loadout, rolled deterministically from their own stored run seed, and ships with a captured fixture as the rules require.

## M3 — Combat engine & floor generation (L) — ✅ delivered 2026-08-22

Combat resolution → CombatScript (COMBAT.md §1–6): rounds, Speed double-attacks, Luck crits, variance, buff/debuff model, boss kits, class resources + signature moves (COMBAT.md §5, the approved Q6/Q26 design), endless-guard. Floor generator (bands, every-10th-boss §3.1, seeded stability — CONTENT_PIPELINE §2), reward rolls through brackets (§3.6, incl. Q22 relic/artifact gating), death consequence + Quick-Raid resolution incl. the chain-to-Floor-N (§3.3/§3.4; Q8) — all headless.
**Exit:** deterministic-replay property test (same seed ⇒ identical script/outcome/loot, watched or skipped); scripted fixture fights prove every stat/effect does its job; first balance-sim smoke runs end-to-end (BALANCE.md §10 harness exists).

**Delivered:** all of the above, 352 unit tests in total. The simulator paid for itself immediately — see BALANCE.md §9a for the three real defects it found on its first run, including an XP double-count in the domain and a Swashbuckler who could not charge her resource at all. Two design decisions were made as a result: a cleared floor applies its own levels, and a death advances the run seed so the next climb is a new tower rather than a replay.

**Left for M9 as designed:** the *ClimberNoShop* archetype plateaus at a boss floor and the class spread is far too wide. Both are artefacts of a game that has no merchants, gear upgrades or ascension yet (M5/M6), so tuning now would be tuning against the wrong game.

## M4 — Tower & combat presentation (XL) — ✅ delivered 2026-08-22

The game becomes visible and playable: tower screen (`StageTrail` treatment, floor preview, one-more-floor button, Quick-Raid UI — UI_FANTASYUI_MAP §2), **combat screen with the full choreography vocabulary** (COMBAT.md §7) including signature set-pieces, x1–x8 playback (§3.5), skip; death screen + reset flow (§3.3, COMBAT.md §8); loot/result windows.
**Exit:** COMBAT.md §9 acceptance criteria, including the 60 fps @2K budget and the "legible at x8" review; climb → die → reset → quick-raid loop plays end-to-end with real drops.

**Delivered:** the loop is playable end-to-end — climb, fight, loot, level, die, Quick-Raid back up — with 371 unit tests and 15 Playwright smoke tests, four of them walking that whole loop in a browser until the tower actually kills the hero. Two things came out stronger than planned. The performer is split into a *pure* choreographer (script → timed beats, no DOM, no clock) and a dumb stage that plays it, which turns pacing into unit tests rather than eyeball checks — including the "legible at x8" rule, now an assertion instead of an opinion. And Brief §20.4's ban on native tooltips became a property of the shipped game rather than of our source: a runtime service adopts every `title` the vendored components emit into a FantasyUI `Tooltip`, and a smoke test asserts the document never contains one.

**Deferred by design:** Battle Speed above x1 needs the account upgrade that M6 builds, so the x2/x4/x8 review happens there (the tiers are wired and tested; only the shop is missing). The hub's other destinations stay disabled until their milestones — each says what it is rather than going quiet (§20.5).

**Q28 (answered 2026-08-23):** fitting FantasyUI art where the library has something that genuinely *is* the enemy, the documented silhouette where it does not. M8 grew that from ten of thirteen to thirty-nine of forty.

## M5 — Character screen, inventory, merchants (L) — ✅ delivered 2026-08-22

Character screen per reference (UI_FANTASYUI_MAP §4): paperdoll + locked ascension slots, stat rows with gold upgrades, PL display, ascension-stars, gear detail (level/ascend with materials), potion buffs. Inventory (Q16: finite backpack, sell-to-merchant, full-drop dialog). Both merchants (§11/§12): bracketed stock, Q17 restock/reroll, potions per Q9/Q18, buy/sell.
**Exit:** every §6/§10 progression action doable through UI with full tooltips (§20.4) and red-dot truth (§20.5); merchant stock provably bracket-bound; buy→equip→stronger-fight loop closes.

**Delivered:** the gold the tower pays out now has somewhere to go — 415 unit tests and 19 Playwright smoke tests, the last of which closes the milestone's own loop in a browser: climb, buy a piece, wear it, watch Power Level rise. Merchant stock is *derived from a seed* rather than stored, which keeps the save small and makes a shop reproducible in a bug report the way a fight already is. The anti-overshoot property test now sweeps both shelves through the shop's own code path, so Brief §13's guarantee is proven for merchants rather than assumed from shared plumbing.

Two decisions worth recording. **Potions do not count toward Power Level** — a drinkable bracket jump would let a player potion up, pull loot they cannot hold, and let the buff lapse, which is §13's overshoot wearing a different hat. And **a shelf restocks when the hero changes bracket**, on top of Q17's clock and floor milestone: goods rolled for a weaker hero are not merely stale, they are visibly unbuyable.

**Q29 (answered 2026-08-23):** buying a draught drinks it. No potion inventory, and the stockpiling loophole stays closed.

## M6 — Quests, tutorial, account upgrades (M) — ✅ delivered 2026-08-22

Daily/weekly engine + board UI (§17; Q10 reset anchors, Q21 3+3 board) incl. hard-quest ticket rewards; tutorial sequence + skip-nudge + completion reward (§18, A10); account upgrades screen with real prices (§15; Q19 x2/x4/x8 tiers); badge service wired game-wide (§20.5).
**Exit:** fresh profile: tutorial → first claims all guided; quest periods reset correctly across clock scenarios (tamper tests); both upgrades purchasable end-to-end (cheat-funded for testing).

**Delivered:** 453 unit tests and 23 Playwright smoke tests, including a fresh profile walking the tutorial to its Lucky Ticket and a hero earning their way to a real account upgrade in a browser. The clock-tamper requirement is met twice over: a period is a *date string*, so "has this day already happened?" is a string comparison rather than arithmetic on a clock the player controls, and a board only ever moves forward — a key that is not later than the stored one leaves everything alone, so winding the system clock back re-opens nothing.

**One design correction the build forced:** quest targets scale by *unit*, not by a growth factor. Gold targets are priced in floors' worth of income at the hero's own depth, because the first attempt priced them by bracket and a level-2 hero in freshly-rolled starting gear can sit three brackets up while still earning floor-4 money — the weekly asked them for 45,000 gold. Recorded in BALANCE.md §9c.

**One tuning fix:** slot 2 now costs about a first session rather than forty early floors. §15.2 calls the first extra slot cheap, and the second hero is how a player meets the other four classes.

## M7 — Gacha (M, +set-piece budget) — ✅ delivered 2026-08-22

Pull resolution through brackets (§16.2; Q20: two banners, single pulls, every pull pays, no pity), banner lobby with honest `RateTable`, ticket faucets wired (§16.1). Then the **§16.3 reveal set-piece** — anticipation build, fake-outs, rarity-escalating light/particle language — built and iterated as its own deliverable (UI_FANTASYUI_MAP §6), reviewed against "feels like a real event", not "transition exists".
**Exit:** odds conform to config over large simulated pulls; bracket property holds from gacha too; the reveal at every rarity tier passes your review (§16.3 is explicitly a taste gate — you sign it off).

**As built:** a pull goes through the same `generateItem` every drop and shelf uses, which is why §16.2's "no overshooting" needed no gacha-specific guard — the permanent property test simply grew a third sweep. Odds are printed from the weights the draw runs on, so a balance pass cannot leave a stale percentage on screen. 40,000 pulls per banner are drawn in CI and checked against the printed table. The rite is a pure choreographer plus a dumb performer (the M4 split), and the fake-out is a *stored* bluff rank that may over-sell and can never under-sell — so the animation replays from a save alongside the prize it staged.

**Awaiting your sign-off:** the taste gate. The reveal is built and its escalation is wired at every tier, but only Epic and below can be seen without a lucky night — say the word and I will add a developer path to stage a Legendary and a Mythical for review.

## M8 — Content fill to EA volume (L) — ✅ delivered 2026-08-23

Author the Q12-agreed volume — ~30 enemy types across ~8 families (floors 1–100) and 10 bosses (floors 10–100) with effect kits, ~5 band themes, procedural modifiers beyond floor 100; quest template pool; polish pass on floor pacing floors 1–30 (first-session quality). Demonstrate the CONTENT_PIPELINE §4 workflow (throwaway enemy + quest added end-to-end in review).
**Exit:** `content:validate` green; floors 1–5000 generate sane (automated sweep: stats monotone, no missing refs); every enemy renders (silhouette fallback confirmed working per §4.3).

**As built:** thirty enemies across eight families and ten bosses, one per gate from floor 10 to 100, with the boss kits chosen as a *sequence* so no two consecutive gates ask the same question. Six band themes, and a band's family list is now load-bearing — the generator draws only from it, which is what turned a stretch of floors from a caption into a place. The exit criterion is a permanent test: `src/content/floors/tower.sweep.test.ts` generates all five thousand floors and asserts no dangling art or string, no non-finite stat, monotone difficulty decade over decade, at least three candidates on every authored floor, and every authored enemy reachable.

**Found while filling the roster:** independent per-floor draws produce runs — the first pacing pass turned up four identical floors in a row on floor 26–29. Floors now avoid the enemy the floor below served, rebuilt from the start of each stretch so it stays pure and stateless. Both this and the family gate are engine rules written once for all content; the §4 demonstration (`content.pipeline.test.ts`) proves adding the next enemy is still a pure data edit.

**Deferred to M9 as designed:** the roster is authored, not tuned. Boss profile multipliers, family weights and the modifier strength are first-pass numbers; M9's simulator gates are where they get their real values.

## M9 — Balance (L) — ✅ delivered 2026-08-23

Simulator-driven tuning across archetypes to BALANCE.md §10's gates: death-wall placement, re-climb-in-minutes, class parity band, gold always-slightly-short (§14), gear 1–10 cheap / 11–15 push (§10.1), rarity arc (§9.2), ticket cadence (§8 of BALANCE.md). Manual playtests at 1080p/2K bracketing the sim.
**Exit:** all sim gates green with the tuned config committed + documented; a full manual first-session playtest (you + me) signs off the feel.

**As built:** the simulator became the authority. Thirteen gates in `tools/sim/gates.test.ts` now assert what the brief states as feel — where the first wall sits, how long a re-climb takes, that no class is a trap pick, that gold never covers the shopping list, that the rarity arc holds, that the round cap never fires — and `npm run sim` is its own CI step. Each gate was verified to fail on a deliberately broken config before being trusted.

**What the first honest measurement found** (all documented in BALANCE.md §9f): gear could lift its own bracket, so a climber's power plateaued at a fixed point *independent of depth* and the first wall sat at floor 80 instead of 15–25. Prices multiplied the bracket exponential twice, so a purse reached twelve billion gold by the sixth session. Experience was polynomial against exponential income, so the level cap arrived in three sittings. Three "band-relative" percentages grew slower than the stats they normalise, so mitigation, crit and double-attack would all have pinned at their caps a few hundred floors in. And bosses were the entire game: ~97% win rates on normal floors against ~22% on gates.

**Measured after tuning:** first wall median floor 16 (IQR 10–20), first sitting reaches floor ~37, re-climbs take 20–90 seconds, class win-rate spread 5.6 points with every class between 42% and 48%, no archetype's purse ever covers its wanted pile, and the round cap fired zero times in ~2,700 fights.

**Found in the manual playtest:** a hero nine floors in was wearing one item with six better ones in the backpack and nothing on screen said so. The character dot now lights when a bag item beats what is worn — the most actionable thing in the game (§20.5).

**Awaiting your sign-off:** the feel. The numbers are where §10 asks, but "does the first session pull?" is yours to judge — the exit criterion says so explicitly.

## M10 — Hardening & ship (M) — ✅ delivered 2026-08-23

§2.1 audit: walk §3–§21 feature-by-feature against the build; kill every dead end/stub. Save-torture (fault-injection, SAVE_SCHEMA §11), perf pass, cross-browser (A9 set), fresh-profile + long-profile regression, Playwright suite complete (ARCHITECTURE §7), CHANGELOG for 0.1, deploy checklist, Electron-forward smoke (relative paths / offline run — ARCHITECTURE §6).
**Exit:** EA 0.1 live on Vercel; the §2.1 sentence is true and demonstrated: hours of play, something always claimable, no unimplemented button anywhere.

**As built.** The audit is written down in `docs/EA_0.1_AUDIT.md`, one row per requirement with a *proof* column naming a test rather than making a claim; it found three unfinished edges (a favicon 404, five silent merchant refusals, a silent Claim button) and the class of bug behind two of them is now a permanent smoke test — **every greyed control must say why**. Torturing the save layer with injected IndexedDB failures found a real bug that reading it had not: a mid-write failure let the browser commit what had already succeeded, so a crash could strand an account pointing at a character that was never created. The perf pass cleared four plausible culprits on frame pacing — the animation was never the problem, the main thread is 95% idle through a fight — and then found two real ones by measuring the other axes: every screen the player left was still in memory (six routes handed the shell an element instead of a screen, so `destroy()` never ran), and the build shipped a source map of the whole TypeScript source. Both are fixed, and the leak has a permanent smoke test. `docs/DEPLOY.md` is the checklist for going live.

**Not delivered here, and deliberately:** the deploy itself. It needs the owner's Vercel account; nothing in this repository holds a credential and nothing in CI deploys. The exit criterion's "live on Vercel" is one owner action away, and `docs/DEPLOY.md` is that action written out.

---

## Standing tracks (every milestone)

CHANGELOG.md updated with every merge (§22); balance values only ever in config (§3.7); new content only through the pipeline (§2.3); docs updated the moment decisions land (done for Q1–Q27; any future open point gets a `⧗Qn` marker until resolved); USER_QUESTIONS.md gains a new entry the moment any new ambiguity appears (§0.3) — it never blocks silently.

## Dependency notes

M2→M3→M4 is the critical path (domain before engine before presentation). M5 needs M2; M6/M7 need M1+M2 and slot flexibly; M8 can start authoring after M3 stabilizes schemas and overlaps M4–M7; M9 needs everything feature-complete; M10 last. The two answers that could have expanded scope came back scope-neutral: Q7 cut tomes from 0.1 and Q26 approved the class design as proposed — the sizing above stands.
