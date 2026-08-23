# EA 0.1 — the §2.1 audit

> Status: **M10, 2026-08-23.** Brief §2.1 is the sentence this whole document
> exists to make true: *"Early Access does not mean unfinished. Everything in
> scope must be complete, polished and functional. No placeholder screens, no
> dead buttons, no 'TODO: balance later'."*
>
> This is a feature-by-feature walk of the brief against the shipped build. Every
> row names where the feature lives and **what proves it** — a test, not a
> claim. Rows that record a deliberate deviation cite the decision that allowed
> it.

## How to read the "proof" column

`unit` is a Vitest file under `src/` or `tools/`; `smoke` is a Playwright test in
`tests/smoke.spec.ts`, named by its own title. Anything marked *by construction*
is enforced by a type or a lint rule rather than a test, and the mechanism is
named — those are the strongest guarantees in the codebase, because the failure
mode is "does not compile" rather than "test goes red".

## §3 — The Tower

| § | Requirement | Where | Proof |
|---|---|---|---|
| 3.1 | Endless tower, every 10th floor a boss | `content/floors`, `domain/tower/floors.ts` | unit `tower.sweep` — all 5,000 floors generate, boss on every tenth |
| 3.1 | Enemy variety per band | `content/enemies` (30 across 8 families) | unit `tower.sweep` — ≥3 candidates on every authored floor, ≥4 distinct in any ten |
| 3.2 | Boss floors harder, with a debuff + self-buff kit | `content/enemies/index.ts`, `BOSS_RAMP` | unit `enemies.content` — every boss has all three; normal debuffs capped below boss debuffs |
| 3.3 | Death resets the run and **nothing else** | `domain/tower/run.ts` `applyDeath` | smoke *a death keeps everything and offers the way back up* |
| 3.4 | Highest floor persists; Quick-Raid re-climbs | `domain/tower/run.ts` `quickRaid` | smoke, same test |
| 3.5 | Battle Speed changes animation only | `ui/combat/`, `domain/combat/resolve.ts` | by construction — the fight is resolved to a script *before* playback; speed is a playback rate |
| 3.6 | Floors pay gold, XP, materials, gear | `domain/tower/rewards.ts` | smoke *clears a floor, banks what it gave and offers one more* |
| 3.7 | Curves meaningful at floor 10, 500, 5000 | `content/balance/curves.ts` | unit `tower.sweep` — finite, positive and monotone decade over decade to floor 5,000 |

## §4 — Combat

| § | Requirement | Where | Proof |
|---|---|---|---|
| 4.1 | The screen that must feel best | `ui/combat/combatStage.ts` | unit `choreography` — pacing is a testable list of beats; manual review at 1080p/2K |
| 4.2 | Auto-resolved, Strength/Defense/HP/Luck/Speed | `domain/combat/resolve.ts` | unit `resolve` — deterministic replay from a seed |
| 4.3 | Enemy avatars bind by id with a silhouette fallback | `content/enemies/index.ts` | unit `enemies.content` + `tower.sweep` — every avatar resolves to real artwork; Q28 records the interim |

## §5–§8 — Hero, stats, ascension, classes

| § | Requirement | Where | Proof |
|---|---|---|---|
| 5 | Name + class, five classes | `ui/screens/heroCreation.ts` | smoke *creates a hero*, *refuses a name that breaks the rules* |
| 6 | Six stats; **Speed only from gear** | `domain/stats.ts` | by construction — `UpgradableStatId = Exclude<StatId,'speed'>` makes a purchasable Speed unrepresentable |
| 6 | Every stat says what it does | `ui/screens/character.ts` | smoke *shows what every stat does, not just what it is* |
| 7 | Ascension 0–5, level caps, slot unlocks | `content/balance/progression.ts` | unit `xp`, `character` |
| 8 | Exactly five classes, real upsides and downsides | `content/classes/` | unit `content` — starting-power spread inside its band; gate *class parity* — win rates 42–48% |
| 8.1 | Weapon rules per class | `domain/items/equip.ts` | unit `equip` |

## §9–§10 — Equipment and upgrading

| § | Requirement | Where | Proof |
|---|---|---|---|
| 9.1 | Nine base slots + five ascension slots | `content/balance/progression.ts` | unit `equip` |
| 9.2 | Six rarities, Epic early, Legendary later, Mythical an event | `content/balance/rewards.ts` | gate *the rarity arc* — no Legendary in bracket 0, Mythical under 0.1% everywhere |
| 10.1 | Gear level 0–15, 1–10 cheap, 11–15 a push | `domain/items/upgrade.ts` | unit `upgrade`; gate *gear upgrades* |
| 10.2 | Gear ascension 0–5 stars, affix slots | `domain/items/upgrade.ts` | unit `upgrade` |

## §11–§14 — Merchants, Power Level, economy

| § | Requirement | Where | Proof |
|---|---|---|---|
| 11 | Equipment Merchant, stock at the hero's power | `domain/merchants/` | smoke *sells what the merchant stocks, at the hero's own power* |
| 12 | Magic Merchant, trinkets and hour-long draughts | `domain/potions/` | unit `potions`; Q29 records buy-is-drink |
| 13 | **Anti-overshoot: no source exceeds the bracket** | `domain/power/brackets.ts` | unit `antiOvershoot` — sweeps drops, both shelves *and* both gacha banners; the brief's own +1000-Strength case is asserted unconstructible |
| 14 | Gold is always slightly short | `content/balance/` | gate *never lets a purse cover everything the player wants* |

## §15–§18 — Account, gacha, quests, tutorial

| § | Requirement | Where | Proof |
|---|---|---|---|
| 15 | **Exactly two** account upgrades | `domain/account/upgrades.ts` | by construction — `UpgradeId` is a two-member union; smoke *sells the two account upgrades, and only those two* |
| 16.1–2 | Two currencies, bracketed pulls, extremely low jackpots | `domain/gacha/` | unit `gacha`; smoke *prints the odds it runs* |
| 16.3 | The reveal is a set-piece, not a transition | `ui/gacha/` | unit `riteChoreography`; smoke *performs the rite, banks the prize and spends the ticket* |
| 17 | 3 dailies + 3 weeklies, one hard | `domain/quests/` | smoke *puts three dailies and three weeklies up, one of them hard* |
| 18 | Skippable tour, completion reward | `ui/tutorial.ts` | smoke *opens the tour…*, *pays the tour out on completion* |

## §19–§21 — Slots, UI, infrastructure

| § | Requirement | Where | Proof |
|---|---|---|---|
| 19 | Five slots, independent saves, reset wipes one | `save/`, `ui/screens/characterSelect.ts` | smoke *offers five slots*, *resets a slot only after the hero name is typed out* |
| 20.1 | Feels like a game, never a web app | all screens | manual review; visual references in `assets/examples/` |
| 20.2 | FantasyUI components, custom only via the allowlist | `ui/fui/` vendored | UI_FANTASYUI_MAP §10 lists all four custom components |
| 20.4 | **No native `title` tooltips anywhere** | `ui/tooltips.ts` | lint rule over our source **and** smoke *never shows a native browser tooltip anywhere* over the shipped document |
| 20.5 | A refusal always says why | every screen | smoke *never greys out a control without saying why* |
| 20.6 | 1080p and 2K; a gate below the supported width | `index.html`, `styles/app.css` | manual review at both; the gate is in markup so it survives a failed boot |
| 21 | No backend, no accounts, offline | `save/` (IndexedDB) | smoke *runs entirely from its own origin — no CDN, no external requests*; *asks the browser for nothing it does not ship* |
| 21 | Wrappable later without a port (ARCHITECTURE §6) | `vite.config.ts` (`base: './'`) | smoke *ships a build that would load from disk, not from a site root* — every emitted URL relative, no off-origin string in the bundle |

## Scope nevers (§2.2), audited

| Never | Status |
|---|---|
| No audio of any kind | No audio API is referenced anywhere in the source. |
| No backend, server, database, accounts or login | The only persistence is IndexedDB; the offline smoke test proves no request leaves the origin. |
| No multiplayer, social or PvP | Nothing in the domain models a second player. |
| No monetization or ads | No payment or ad code exists; the gacha spends only earned tickets. |
| No mobile UI in 0.1 | The build gates below 1280 px with an in-language message rather than reflowing. |
| No Electron packaging yet | No Electron dependency; the build is verified location-independent so the later wrap is packaging, not a port. |
| Exactly two account upgrades | Enforced by the type. |
| Exactly five classes | Enforced by the type. |

## Performance, measured

Jank is the one defect a player feels without being able to name, so this pass
measured instead of guessing. The headline is that almost nothing here was the
game's fault — worth writing down only because it took four wrong hypotheses to
establish, and because the one real finding was in the build rather than the
game.

### What ships, and what a player downloads

| | |
|---|---|
| Game code (JS) | 254 KB raw, **74 KB gzipped** |
| Styles (CSS) | 268 KB raw, **40 KB gzipped** |
| Everything on the origin | 17 MB — 15 MB of it vendored FantasyUI art packs |
| Fetched to reach the title screen | ~1.8 MB |
| Fetched to be standing in the tower, playing | ~2.5 MB |

The gap between 17 MB and 2.5 MB is art the browser never asks for. FantasyUI
packs ship whole (`spell-icons` alone is 7.9 MB) because they are vendored as
units, and a page fetches only the images it paints — so the gap costs host disk
and costs the player nothing. Pruning files that a vendored stylesheet still
references would be the silent fork the project forbids, so it was left alone.

**The one real finding: the build shipped its own source.** `sourcemap: true`
emitted a 1 MB map *and* pointed the bundle at it, so one click in DevTools
opened the full TypeScript source of a commercial game. There is no error tracker
to consume a map (§21), so production builds no longer emit one; `docs/DEPLOY.md`
§5 records how to read a player's stack trace without it.

### Frame pacing: four hypotheses that died

Measured through real fights at 1920×1080, with `requestAnimationFrame` deltas
and Chromium's `Performance.getMetrics` counters side by side. The container has
no GPU and rasterises in software, which is why the first three readings misled:

1. **"The charged-resource glow repaints a 240 px portrait every frame."** It did
   — `filter: brightness()` cannot be composited — and it now animates a
   composited overlay's opacity instead. **This did not move frame pacing at
   all.** A correct change that fixed nothing measurable, recorded that way
   rather than claimed as the fix.
2. **"The vendored stat bars animate `width`, which forces layout."** They do.
   Measured cost: **30–66 ms of layout across an entire fight**, because the
   fills are absolutely positioned inside an `overflow: hidden` well and their
   layout is contained. Not worth overriding a vendored component's look for.
3. **"Promoting the animated layers will help."** A first A/B said +10%; the
   refined version replicated as noise in both directions. Nothing shipped on
   that basis — a 10% reading in a container whose median frame time swings
   between 16.7 ms and 66.6 ms across identical runs is not a measurement.
4. **"Then it is the set-pieces."** Disabling every impact frame, floating number
   and transition changed nothing either.

What the counters say, stable across three whole fights:

| | fight 1 | fight 2 | fight 3 |
|---|---|---|---|
| Wall clock | 6.4 s | 9.0 s | 6.4 s |
| Main thread busy | 375 ms | 482 ms | 331 ms |
| — of which script | 24 ms | 28 ms | 18 ms |
| — style recalculation | 62 ms | 91 ms | 58 ms |
| — layout | 66 ms | 56 ms | 30 ms |
| **Occupancy** | **5.8%** | **5.4%** | **5.2%** |

**The main thread is ~95% idle through a fight and no long task ever fires.** Two
controls place the remaining cost outside the game: the combat screen *with the
fight over and every animation cancelled* paces at a clean 16.7 ms (3 late frames
in 165) — same scene, same art, no animation; and frames delivered scale with
painted area, 1280×720 returning ~1.7× the frames of 1920×1080 for identical
work. That is rasterisation, which a player's GPU does and this container does in
software.

### x8

Battle Speed is a playback rate, so x8 compresses the same beats into an eighth
of the time. Rather than argue about the projection, the measurement takes the
ceiling: **Skip applies every remaining beat of a fight in one burst** — the
hardest thing the presentation can be asked to do — and costs **20 ms of main
thread, with no long task**. x8 spreads that same work over roughly 800 ms, so it
cannot miss a frame the browser would otherwise have made.

### Memory across a long session — a real leak, found and fixed

Frame pacing was a false alarm. Memory was not.

Sampling a played-in profile every five floors — climbing, dying, raiding back,
and walking every screen in the game in between — showed live DOM flat at ~215
nodes while **listeners climbed linearly: 35 → 280 → 525 → 809**, with retained
nodes tracking them, 717 → 1163 → 1703 → 2547. Something was holding every screen
the player had left.

Splitting the two halves of the session named it in one run:

| | listeners | retained nodes |
|---|---|---|
| baseline | 49 | 713 |
| after 18 screen visits | 770 | 2249 |
| after 36 | 1505 | 3890 |
| after 54 | 2240 | 5532 |
| then 9 fights | 2242 | 5645 |

Navigation leaked **~41 listeners and ~91 retained nodes per screen visit**;
fights leaked nothing at all. That asymmetry is the whole diagnosis. The combat
route returns its screen, so the router destroys it. The six shell-wrapped routes
passed `createTowerScreen({...}).el` — the element, not the screen — so the screen
object was dropped on the floor and **its `destroy()` was never called**. Chromium's
detached-node view confirmed it: whole `omf-shell` trees, one per navigation,
still retained after a forced collection.

The fix is that the shell now takes the screen instead of its element and owns
its teardown. Re-measured over the same 54 visits: **listeners flat at 35,
retained nodes flat at 608, one detached tree throughout** — no growth at all,
and *below* the first reading once the opening screen's leftovers are collected.
Heap still drifts 2.4 → 3.2 MB over those visits and then flattens, which is image
decode rather than retention.

It is now a permanent smoke test — *does not leak a screen every time the player
walks the game* — verified by reverting the fix and watching it fail
(280 → 1260 listeners).

## Findings, and what was done about them

The audit walked every screen in a real browser and dumped every control on it.
Three things came back:

1. **A 404 on every page load.** The browser asks for `/favicon.ico` on its own
   and the game did not answer, so every player's console carried an error and
   every tab showed the browser's default mark. Fixed: the Lootspire now has an
   icon, drawn in the game's own palette rather than cropped from key art
   (a painted scene is mud at sixteen pixels). A smoke test now fails on any
   response ≥ 400 anywhere in the boot-and-play path.
2. **Five silent refusals on the merchant shelf.** `ShopPanel` greys out anything
   dearer than the purse — correctly, and without saying so. Every other price in
   the game prints its shortfall, so the shop rows now do too.
3. **A silent Claim button on every unfinished quest.** The progress bar was the
   only explanation. It now says how much is left.

A permanent smoke test was added for the class of bug behind (2) and (3):
**every greyed-out control in the game must say why**, in a tooltip or in visible
text on its own card. A new silent refusal fails CI.

Two more came out of the measuring rather than the walking, and both are worse
bugs than anything on screen:

4. **Every screen the player left was still in memory.** Six of the eight routes
   handed the shell `createTowerScreen({...}).el` — the element, not the screen —
   so nothing ever called the screen's `destroy()`. Roughly 41 listeners and 91
   retained nodes accumulated per screen visit, without bound. The shell now owns
   its screen and tears it down; a smoke test walks the game five times over and
   fails if the browser is holding more at the end than in the middle.
5. **The build shipped its own source.** A 1 MB source map, and the bundle
   pointed at it. Production builds no longer emit one.

Both are in *Performance, measured* above with the numbers behind them.
